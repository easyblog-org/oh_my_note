---
category: Java从入门到精通
tags:
  - 后端开发
  - Java
summary: 一篇关于 Java8 Stream并行计算原理的文章。
featured: false
---

## Java 8 Stream并行计算原理



## 前言

众所周知，Java 使用Stream流做多线程处理是非常方便的。随着并行编程越来越流行，Java从1.7就开始提供了Fork/Join 支持并行处理，并且在1.8版本进一步加强了相关功能。并行处理就是将任务拆分子任务，分发给多个处理器同时处理之后进行合并。下面将会对并行流(parallelStream)原理分析及注意事项进行详细介绍。



## 一、parallelStream是什么

Java8中提供了能够更方便处理集合数据的Stream类，其中parallelStream()方法能够充分利用多核CPU的优势，使用多线程加快对集合数据的处理速度。parallelStream主要用于利用处理器的多个核心。通常，任何Java代码都有一个处理流，在这里它是按顺序执行的。然而，通过使用并行流，我们可以将代码分成多个流，这些流在不同的内核上并行执行，最终的结果是各个结果的组合。然而，**处理的顺序不在我们的控制之下**。

因此，建议在以下情况下使用并行流：**无论执行顺序如何，结果不受影响，一个元素的状态不影响另一个元素，并且数据源也不受影响。**

parallelStream()方法的源码如下：

```java
/**
* @return a possibly parallel {@code Stream} over the elements in this
* collection
* @since 1.8
*/
default Stream<E> parallelStream() {
    return StreamSupport.stream(spliterator(), true);
}
```



从上面代码中注释的**@return a possibly parallel**可以看得出来，parallelStream()并不是一定返回一个并行流，有可能parallelStream()全是由主线程顺序执行的。因此使用parallelStream时要特别注意。



## 二、parallelStream原理分析

在Java中使用strem流做多线程处理是非常方便的：

```java
List<Integer> list=Lists.newArrayList<>(1,2,3,4,5,6,7);
list.parallelStream().xxx(s -> {
    // 后续业务处理
})
```

但是parallelStream是如何实现多线程处理的呢？其实看源码我们会发现parallelStream是使用线程池**ForkJoin**来调度的，并且参与并行处理的线程有**主线程**以及**ForkJoinPool中的worker线程。**

### 2.1 Fork/Join框架

parallelStream的底层是基于**ForkJoinPool**的，ForkJoinPool实现了ExecutorService接口，因此和线程池有着密不可分的关系。ForkJoinPool和ExecutorService的继承关系如图所示：

![img](https://pdai.tech/images/thread/java-thread-x-forkjoin-1.png)

#### Fork/Join框架主要的三个模块

Fork/Join框架主要包含三个模块:

- `ForkJoinTask`：我们要使用ForkJoin框架，必须首先创建一个ForkJoin任务。它提供在任务中执行fork()和join()操作的机制，通常情况下我们不需要直接继承ForkJoinTask类，而只需要继承它的子类，Fork/Join框架提供了以下两个子类：
  - `RecursiveAction`：是一种ForkJoinTask的子类，用于表示不需要返回结果的任务，即只需要执行一些操作，而不需要返回结果。
  - `RecursiveTask`：是一种ForkJoinTask的子类，用于表示需要返回结果的任务，即需要执行一些操作，并返回一个结果。
- `ForkJoinPool`：是Fork/Join框架的核心，它管理着一组线程池，并提供了线程池的创建、启动、关闭和维护等操作。ForkJoinTask需要通过ForkJoinPool来执行，任务分割出的子任务会添加到当前工作线程所维护的双端队列中，进入队列的头部。当一个工作线程的队列里暂时没有任务时，它会随机从其他工作线程的队列的尾部获取一个任务。
- `ForkJoinWorkerThread`：是Fork/Join框架中的工作线程，它负责执行具体的任务，并将结果返回给主线程。

这三者的关系是: ForkJoinPool可以通过池中的ForkJoinWorkerThread来处理ForkJoinTask任务。



#### 分治算法(Divide-and-Conquer)

Fork/Join框架主要采用分而治之的理念来处理问题，对于一个比较大的任务，首先将它拆分(fork)为多个小任务Task A、Task B等。再使用新的线程thread1去处理Task A，thread2去处理Task B。

如果thread1认为Task A还是太大，则继续往下拆分成新的子任务Task A-1与Task A-2。thread2同理。

之后将Task A-1和Task A-2的处理结果合并(join)成Result1，Task B-1和Task B-2的处理结果合并(join)成Result2，最后将Result1与Result2合并成最后的结果。

下面用图更清晰的进行描述：

![img](https://pdai.tech/images/thread/java-thread-x-forkjoin-2.png)

#### 工作窃取(work-stealing)算法

ForkJoinPool提供了一个更有效的利用线程的机制，当ThreadPoolExecutor还在用单个队列存放任务时，ForkJoinPool已经分配了与线程数相等的队列，当有任务加入线程池时，会被平均分配到对应的队列上，各线程进行正常工作，当有线程提前完成时，会从队列的末端“窃取”其他线程未执行完的任务，当任务量特别大时，CPU多的计算机会表现出更好的性能。

工作窃取算法的优点在于：

1. 它可以充分利用多核处理器的计算资源，提高程序的并发性能。
2. 它可以避免线程之间的竞争，提高线程的执行效率。
3. 它可以动态地调整任务的分配策略，从而避免任务的负载不平衡。



#### 实例演示：计算1~20_0000_0000

`CalculatedRecursiveTask`

```java
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.concurrent.RecursiveTask;


@Data
@AllArgsConstructor
public class CalculatedRecursiveTask extends RecursiveTask<Long> {

    private static final long THRESHOLD = 100_0000L;

    final long start; //开始计算的数
    final long end; //最后计算的数


    @Override
    public Long compute() {
        if (end - start < THRESHOLD) {
            // 子任务跨度小于100_0000L时计算区间和
            long sum = 0;
            for (long i = start; i <= end; i++)
                sum += i;
            return sum;
        }

        CalculatedRecursiveTask halfTask = new CalculatedRecursiveTask(start, (start + end) / 2);
        CalculatedRecursiveTask otherHalfTask = new CalculatedRecursiveTask((start + end) / 2 + 1, end);

        halfTask.fork();
        otherHalfTask.fork();

        // 获取任务执行结果
        return halfTask.join() + otherHalfTask.join();
    }
}
```



`ForkJoinTest`

```java
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.ForkJoinTask;


public class ForkJoinTest {

    public static void main(String[] args) throws ExecutionException, InterruptedException {
        // ForkJoinPool 计算 1~20_0000_0000
        ForkJoinPool pool = new ForkJoinPool();
        long startTime = System.currentTimeMillis();
        long start = 1;
        long end = 20_0000_0000;
        ForkJoinTask<Long> task = new CalculatedRecursiveTask(start, end);
        pool.submit(task);
        System.out.println(task.get());
        long endTime = System.currentTimeMillis();

        System.out.printf("Fork/Join sum from %s to %s cost Time %s ms\n", start, end, endTime - startTime);

        // 传统for 循环计算 1~20_0000_0000
        long startTime2 = System.currentTimeMillis();
        long sum=0;
        for (long i=start;i<=end;i++){
            sum+=i;
        }
        long endTime2 = System.currentTimeMillis();
        System.out.println(sum);
        System.out.printf("for iterate sum from %s to %s cost Time %s ms\n", start, end, endTime2 - startTime2);
    }

}
```



执行结果如下：

![](http://image.easyblog.top/1693053072098a77187bc-72a9-438e-9c8c-de81e581505d.png)



### 2.2 从源码看Stream并行计算原理

看源码之前让我们带着下面几个疑问：

1. 如何转换流类型，怎么实现的？
2. 如何切分任务的？
3. 如何合并任务结果的？
4. Stream默认的并行线程池来源是哪里，在哪里定义的？



#### 源码结构

Stream 相关类和接口的继承关系如下图所示：

![img](https://pic4.zhimg.com/80/v2-87aebbcb42a4e62396e2f9219bd93907_1440w.webp)



Stream 的基础用法就不再叙述了，这里从一段代码开始，分析 Stream 的工作原理。

```java
@Test
public void testStream() {
    List<String> names = Arrays.asList("kotlin", "java", "go");
    int maxLength = names.stream().filter(name -> name.length() <= 4).map(String::length)
            .max(Comparator.naturalOrder()).orElse(-1);
    System.out.println(maxLength);
}
```



当使用 Stream 时，主要有 3 部分组成，下面一一讲解。

#### 加载数据源

调用 `names.stream()` 方法，会初次加载 ReferencePipeline 的 Head 对象，此时为加载数据源操作。

`java.util.Collection#stream`

```java 
default Stream<E> stream() {
    return StreamSupport.stream(spliterator(), false);
}
```



StreamSupport 类中的 stream 方法，初始化了一个 ReferencePipeline的 Head 内部类对象。

`java.util.stream.StreamSupport#stream(java.util.Spliterator, boolean)`

```java
public static <T> Stream<T> stream(Spliterator<T> spliterator, boolean parallel) {
    Objects.requireNonNull(spliterator);
    return new ReferencePipeline.Head<>(spliterator,
                                        StreamOpFlag.fromCharacteristics(spliterator),
                                        parallel);
}
```



#### 中间操作

接着为 `filter(name -> name.length() <= 4).mapToInt(String::length)`，是中间操作，分为无状态中间操作 StatelessOp 对象和有状态操作 StatefulOp 对象，此时的 Stage 并没有执行，而是通过AbstractPipeline 生成了一个中间操作 Stage 链表。

`java.util.stream.ReferencePipeline#filter`

```java
@Override
public final Stream<P_OUT> filter(Predicate<? super P_OUT> predicate) {
    Objects.requireNonNull(predicate);
    return new StatelessOp<P_OUT, P_OUT>(this, StreamShape.REFERENCE,
                                    StreamOpFlag.NOT_SIZED) {
        @Override
        Sink<P_OUT> opWrapSink(int flags, Sink<P_OUT> sink) {
            return new Sink.ChainedReference<P_OUT, P_OUT>(sink) {
                @Override
                public void begin(long size) {
                    downstream.begin(-1);
                }

                @Override
                public void accept(P_OUT u) {
                    if (predicate.test(u))
                        downstream.accept(u);
                }
            };
        }
    };
}
```



`java.util.stream.ReferencePipeline#map`

```java
@Override
@SuppressWarnings("unchecked")
public final <R> Stream<R> map(Function<? super P_OUT, ? extends R> mapper) {
    Objects.requireNonNull(mapper);
    return new StatelessOp<P_OUT, R>(this, StreamShape.REFERENCE,
                                    StreamOpFlag.NOT_SORTED | StreamOpFlag.NOT_DISTINCT) {
        @Override
        Sink<P_OUT> opWrapSink(int flags, Sink<R> sink) {
            return new Sink.ChainedReference<P_OUT, R>(sink) {
                @Override
                public void accept(P_OUT u) {
                    downstream.accept(mapper.apply(u));
                }
            };
        }
    };
}
```

可以看到 filter 和 map 方法都返回了一个新的 `StatelessOp` 对象。new StatelessOp 将会调用父类 AbstractPipeline 的构造函数，这个构造函数将前后的 Stage 联系起来，生成一个 Stage 链表：

```java
AbstractPipeline(AbstractPipeline<?, E_IN, ?> previousStage, int opFlags) {
    if (previousStage.linkedOrConsumed)
        throw new IllegalStateException(MSG_STREAM_LINKED);
    previousStage.linkedOrConsumed = true;
    previousStage.nextStage = this;

    this.previousStage = previousStage;
    this.sourceOrOpFlags = opFlags & StreamOpFlag.OP_MASK;
    this.combinedFlags = StreamOpFlag.combineOpFlags(opFlags, previousStage.combinedFlags);
    this.sourceStage = previousStage.sourceStage;
    if (opIsStateful())
        sourceStage.sourceAnyStateful = true;
    this.depth = previousStage.depth + 1;
}
```



#### 终结操作

最后为 `max(Comparator.naturalOrder())`，是终结操作，会生成一个最终的 Stage，通过这个 Stage 触发之前的中间操作，从最后一个Stage开始，递归产生一个Sink链。

`java.util.stream.ReferencePipeline#max`

```java
@Override
public final Optional<P_OUT> max(Comparator<? super P_OUT> comparator) {
    return reduce(BinaryOperator.maxBy(comparator));
}
```

最终调用到 `java.util.stream.AbstractPipeline#wrapSink`，这个方法会调用 opWrapSink 生成一个 Sink 链表，对应到本文的例子，就是 filter 和 map 操作。

```java
@Override
@SuppressWarnings("unchecked")
final <P_IN> Sink<P_IN> wrapSink(Sink<E_OUT> sink) {
    Objects.requireNonNull(sink);

    for ( @SuppressWarnings("rawtypes") AbstractPipeline p=AbstractPipeline.this; p.depth > 0; p=p.previousStage) {
        sink = p.opWrapSink(p.previousStage.combinedFlags, sink);
    }
    return (Sink<P_IN>) sink;
}
```



在上面 opWrapSink 上断点调试，发现最终会调用到本例中的 filter 和 map 操作。

![img](https://pic4.zhimg.com/80/v2-f8a2801e10c8b817c56bd828c6eefc93_1440w.webp)

wrapAndCopyInto 生成 Sink 链表后，会通过 copyInfo 方法执行 Sink 链表的具体操作。

```java
@Override
final <P_IN> void copyInto(Sink<P_IN> wrappedSink, Spliterator<P_IN> spliterator) {
    Objects.requireNonNull(wrappedSink);

    if (!StreamOpFlag.SHORT_CIRCUIT.isKnown(getStreamAndOpFlags())) {
        wrappedSink.begin(spliterator.getExactSizeIfKnown());
        spliterator.forEachRemaining(wrappedSink);
        wrappedSink.end();
    }
    else {
        copyIntoWithCancel(wrappedSink, spliterator);
    }
}
```



上面的核心代码是：

```text
spliterator.forEachRemaining(wrappedSink);
```

`java.util.Spliterators.ArraySpliterator#forEachRemaining`

```java
@Override
public void forEachRemaining(Consumer<? super T> action) {
    Object[] a; int i, hi; // hoist accesses and checks from loop
    if (action == null)
        throw new NullPointerException();
    if ((a = array).length >= (hi = fence) &&
        (i = index) >= 0 && i < (index = hi)) {
        do { action.accept((T)a[i]); } while (++i < hi);
    }
}
```

断点调试，可以发现首先进入了 filter 的 Sink，其中 accept 方法的入参是 list 中的第一个元素“kotlin”（代码中的 3 个元素是："kotlin", "java", "go"）。filter 的传入是一个 Lambda 表达式：

```java
filter(name -> name.length() <= 4)
```

显然这个第一个元素“kotlin”的 predicate 是不会进入的。

![img](https://pic4.zhimg.com/80/v2-b6c595eba81d8b2ce389ba4423dd3913_1440w.webp)

对于第二个元素“java”，predicate.test 会返回 true（字符串“java”的长度<=4），则会进入 map 的 accept 方法。

![img](https://pic1.zhimg.com/80/v2-b40ad592c77e9cb5ff7f85a51986bd14_1440w.webp)

本次调用 accept 方法时，empty 为 false，会将 map 后的结果（int 类型的 4）赋值给 t。

```java
public static <T> TerminalOp<T, Optional<T>>
makeRef(BinaryOperator<T> operator) {
    Objects.requireNonNull(operator);
    class ReducingSink
            implements AccumulatingSink<T, Optional<T>, ReducingSink> {
        private boolean empty;
        private T state;

        public void begin(long size) {
            empty = true;
            state = null;
        }

        @Override
        public void accept(T t) {
            if (empty) {
                empty = false;
                state = t;
            } else {
                state = operator.apply(state, t);
            }
        }

        ……
        }
}
```

对于第三个元素“go”，也会进入 accept 方法，此时 empty 为 true, map 后的结果（int 类型的 2）会与上次的结果 4 通过自定义的比较器相比较，存入符合结果的值。

```java
public static <T> BinaryOperator<T> maxBy(Comparator<? super T> comparator) {
    Objects.requireNonNull(comparator);
    return (a, b) -> comparator.compare(a, b) >= 0 ? a : b;
}
```

本文代码中的 max 传入的比较器为：

```java
max(Comparator.naturalOrder())
```

至此会返回 int 类型的 4。



#### 并行处理

上面的例子是串行处理的，如果要改成并行也很简单，只需要在 stream() 方法后加上 `parallel()` 就可以了，并行代码可以写成：

```java
@Test
public void testStream() {
    List<String> names = Arrays.asList("kotlin", "java", "go");
    int maxLength = names.stream().parallel().filter(name -> name.length() <= 4)
            .map(String::length).max(Comparator.naturalOrder()).orElse(-1);
    System.out.println(maxLength);
}
```



`parallel`方法会将 **AbstractPipeline 中的 parallel 标识设置为 true**

`AbstractPipeline#parallel`

```java
@Override
@SuppressWarnings("unchecked")
public final S parallel() {
   // AbstractPipeline 头结点 
   sourceStage.parallel = true;
   return (S) this;
}
```

Stream 的并行处理在执行终结操作之前，跟串行处理的实现是一样的。而在调用终结方法之后，实现的方式就有点不太一样，会调用 TerminalOp 的 evaluateParallel 方法进行并行处理。

```java
final <R> R evaluate(TerminalOp<E_OUT, R> terminalOp) {
    assert getOutputShape() == terminalOp.inputShape();
    if (linkedOrConsumed)
        throw new IllegalStateException(MSG_STREAM_LINKED);
    linkedOrConsumed = true;

    return isParallel()
            ? terminalOp.evaluateParallel(this, sourceSpliterator(terminalOp.getOpFlags()))
            : terminalOp.evaluateSequential(this, sourceSpliterator(terminalOp.getOpFlags()));
}
```



并行流处理会走上面的 `terminalOp.evaluateParallel`，最终会调ReduceOps.ReduceOp#evaluateParallel

`ReduceOps.ReduceOp#evaluateParallel`

![截屏2023-08-27 上午11.14.40](/Users/mac/Library/Application Support/typora-user-images/截屏2023-08-27 上午11.14.40.png)



ReduceTask 是 AbatractTask的直接实现类，是 ForkJoin 的简介实现类

![](http://image.easyblog.top/16931071346982da5a970-2713-403b-b95f-4fed090aba84.png)



ReduceTask在调用构造方法前会初始化父类 AbatractTask 的静态属性

![](http://image.easyblog.top/16931073098874da3e778-0dc5-449f-98c7-e486562649fd.png)



在初始化`LEAF_TARGET`时会调用ForkJoinPool的静态方法 `ForkJoinPool.getCommonPoolParallelism()`，这时也会初始化ForkJoinPool，会执行ForkJoinPool的静态方法快初始化commonPool

![](http://image.easyblog.top/16931077438046c445374-bb16-43a5-86c2-374c7c420d14.png)

主要初始化逻辑在ForkJoinPool另一个静态方法中`ForkJoinPool.makeCommonPool()`，创建 ForkJoinPool 实例内部线程总数 parallelism 默认为: **当前运行环境的 CPU 核数 - 1**

![](http://image.easyblog.top/16931080462030b5a470c-4027-4a37-8ab3-7008245ad1d7.png)



接下来的流程是ForkJoin对 Stream 处理进行分片，最终会调用下面的代码，这里就不展开分析了。

`java.util.stream.AbstractTask#compute`

![](http://image.easyblog.top/1693108266218f0c22006-e509-47a1-97f6-43b0bd432c4d.png)





## 三、注意事项

#### 3.1 为什么使用并行流

并行流的引入是为了提高程序的性能，但是选择并行流并不总是最好的选择。在某些情况下，我们需要以特定的顺序执行代码，在这些情况下，我们最好使用顺序流以牺牲性能为代价来执行任务。这两种流之间的性能差异仅在大型程序或复杂项目中才值得关注。对于小规模的项目，它甚至可能不明显。基本上，当顺序流表现不佳时，您应该考虑使用并行流。



#### 3.2 Stream和parallelStream选择

在从stream和parallelStream方法中进行选择时,我们可以考虑以下几个问题：

1. 是否需要并行？

2. 任务之间是否是独立的？是否会引起任何竞态条件？

3. 结果是否取决于任务的调用顺序？

对于问题1，需要明确要解决的问题是什么，数据量有多大，计算的特点是什么？并不是所有的问题都适合使用并发程序来求解，比如当数据量不大时，顺序执行往往比并行执行更快。毕竟，准备线程池和其它相关资源也是需要时间的。但是，当任务涉及到I/O操作并且任务之间不互相依赖时，那么并行化就是一个不错的选择。通常而言，将这类程序并行化之后，执行速度会提升好几个等级。

对于问题2，如果任务之间是独立的，并且代码中不涉及到对同一个对象的某个状态或者某个变量的更新操作，那么就表明代码是可以被并行化的。

对于问题3，由于在并行环境中任务的执行顺序是不确定的，因此对于依赖于顺序的任务而言，并行化也许不能给出正确的结果。



#### 3.3 正确使用并行流

**并行流并不总是比顺序流快**。所以正确的姿势使用并行流是尤为重要的，不然适得其反。

决定某个特定情况下是否有必要使用并行流。可以参考一下几点建议

1. 如果有疑问，提前进行测量和检查。并行流有时候会和直觉不一致，所以在考虑选择顺序流还是并行流时，很重要的建议就是用适当的基准来检查其性能。

2. 留意装箱。自动装箱和拆箱操作会大大降低性能。Java 8中有原始类型流（IntStream、LongStream和DoubleStream），尽量使用这些流进行操作。

3. 有些操作本身在并行流上的性能就比顺序流差。特别是limit和findFirst等依赖于元素顺序的操作，它们在并行流上执行的代价非常大。例如，findAny会比findFirst性能好，因为它不一定要按顺序来执行。你总是可以调用unordered方法来把有序流变成无序流。那么，如果你需要流中的N个元素而不是专门要前N个的话，对无序并行流调用limit可能会比单个有序流（比如数据源是一个List）更高效。

4. 考虑流的操作流水线的总计算成本。设N是要处理的元素的总数，Q是一个元素通过流水线的大致处理成本，则N*Q就是这个对成本的一个粗略的定性估计。Q值较高就意味着使用并行流时性能好的可能性比较大。

5. 对于较小的数据量，选择并行流几乎从来都不是一个好的决定。并行处理少数几个元素的好处还抵不上并行化造成的额外开销。

6. 考虑流背后的数据结构是否易于分解。例如，ArrayList的拆分效率比LinkedList高得多，因为前者用不着遍历就可以平均拆分，后者则必须遍历。另外，用range工厂方法创建的原始类型流也可以快速分解。可以参考一下表格：

   | 数据源          | 性能 |
   | :-------------- | :--- |
   | ArrayList       | 极佳 |
   | LinkedList      | 差   |
   | IntStrean.range | 极佳 |
   | Strean.iterate  | 差   |
   | HashSet         | 好   |
   | TreeSet         | 好   |

7. 流自身的特点以及流水线中的中间操作修改流的方式，都可能会改变分解过程的性能。例如，一个SIZED流可以分成大小相等的两部分，这样每个部分都可以比较高效地并行处理，但筛选操作可能丢弃的元素个数无法预测，从而导致流本身的大小未知。

8. 还要考虑终端操作中合并步骤的代价是大是小（例如Collector中的combiner方法）。如果这一步代价很大，那么组合每个子流产生的部分结果所付出的代价就可能会超出通过并行流得到的性能提升。



#### 3.4 需要注意线程安全问题

因为是并行流，所以所涉及到的**数据结构需要使用线程安全的**。

例如：

```java
listByPage.parallelStream().forEach(str-> {
    //使用线程安全的数据结构
    //ConcurrentHashMap
    //CopyOnWriteArrayList
    //等等进行操作
});
```

#### 3.5 线程关联的ThreadLocal将会失效

由于开头提到的主线程有可能参与到parallelStream中的任务处理的过程中。因此如果我们处理的任务方法中包含对ThreadLocal的处理，可能除主线程之外的所有线程都获取不到自己的线程局部变量，加之ForkJoinPool中的线程是反复使用的，线程关联的ThreadLocal会发生共用的情况。



所以建议是，parallelStream中就不要使用ThreadLocal了，要么在任务处理方法中，第一行先进行ThreadLocal.set()，之后再由ThreadLocal.get()获取到自己的线程局部变量



#### 3.6 使用并行流时，不要使用collectors.groupingBy、collectors.toMap

使用并行流时，不要使用collectors.groupingBy、collectors.toMap，替代为collectors.groupingByConcurrent、collectors.toConcurrentMap，或直接使用串行流。

原因，并行流执行时，通过操作Key来合并多个map的操作比较昂贵。详细大家可以查看官网介绍。

![img](https://img-blog.csdnimg.cn/91caac00d30e4a1cafb8494d4dd1265f.png)

https://docs.oracle.com/javase/tutorial/collections/streams/parallelism.html#concurrent_reduction



#### 3.7  使用parallelStream也不一定会提升性能

在CPU资源紧张的时候，使用并行流可能会带来频繁的线程上下文切换，导致并行流执行的效率还没有串行执行的效率高。

Stream 性能测试：https://github.com/CarpenterLee/JavaLambdaInternals/blob/master/8-Stream%20Performance.md