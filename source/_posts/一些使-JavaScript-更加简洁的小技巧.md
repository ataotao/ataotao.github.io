---
title: 一些使 JavaScript 更加简洁的小技巧
categories: Javascript
date: 2018-11-07 09:51:17
tags:
    - Javascript
---

一些使 JavaScript 更加简洁的小技巧
================================================

1.清空或截断数组
在不重新给数组赋值的情况下，清空或截断数组的最简单方法是更改​​其 length 属性值：

```
    const arr = [11, 22, 33, 44, 55, 66];
    // truncanting
    arr.length = 3;
    console.log(arr); //=> [11, 22, 33]
    // clearing
    arr.length = 0;
    console.log(arr); //=> []
    console.log(arr[2]); //=> undefined
```

2.使用对象解构(destructuring)模拟命名参数
当您需要将一组可选变量传递给某个函数时，你很可能已经在使用配置对象了，如下所示：

```
    doSomething({ foo: 'Hello', bar: 'Hey!', baz: 42 });
    function doSomething(config) {
        const foo = config.foo !== undefined ? config.foo : 'Hi';
        const bar = config.bar !== undefined ? config.bar : 'Yo!';
        const baz = config.baz !== undefined ? config.baz : 13;
        // ...
    }
```

这是一个古老但有效的模式，它试图在 JavaScript 中模拟命名参数。 函数调用看起来很好。 另一方面，配置对象处理逻辑不必要地冗长。 使用ES2015 对象解构，您可以绕过这个缺点：

```
    function doSomething({ foo = 'Hi', bar = 'Yo!', baz = 13 }) {
        // ...
    }
```

如果你需要使配置对象也可选，也很简单：

```
    function doSomething({ foo = 'Hi', bar = 'Yo!', baz = 13 } = {}) {
        // ...
    }
```

3.使用对象解构来处理数组
可以使用对象解构将数组项分配给各个变量：

```
const csvFileLine = '1997,John Doe,US,john@doe.com,New York';
const { 2: country, 4: state } = csvFileLine.split(',');
```

4.switch 语句中使用范围值
注意：经过一番思考后，我决定将这个技巧与本文中的其他技巧区分开来。 这不是一种节省时间的技术，不适用于现实生活中的代码。 请记住：“If”语句在这种情况下总是更好。

与这篇文章中的其他提示不同，它更像是一种好奇探索而不是真正使用的东西。

但是，出于历史原因，我会在本文中保留它。

这是在 switch 语句中使用范围值的简单技巧：

```
    function getWaterState(tempInCelsius) {
        let state;
        switch (true) {
            case (tempInCelsius < = 0): state = 'Solid'; break; case (tempInCelsius > 0 && tempInCelsius < 100): 
            state = 'Liquid';
            break;
            default: 
            state = 'Gas';
        }
        return state;
    }
```


5.使用 async/await 来 await多个async函数
可以使用 Promise.all 来 await 多个 async（异步）函数。

```
await Promise.all([anAsyncCall(), thisIsAlsoAsync(), oneMore()])
```

6.创建纯(pure)对象
您可以创建一个 100％ 纯对象，它不会从 Object 继承任何属性或方法（例如，constructor，toString() 等）。

```
const pureObject = Object.create(null);
console.log(pureObject); //=> {}
console.log(pureObject.constructor); //=> undefined
console.log(pureObject.toString); //=> undefined
console.log(pureObject.hasOwnProperty); //=> undefined
```


7.格式化JSON代码
JSON.stringify 不仅可以简单地将对象转化为字符串。你也可以用它来格式化JSON输出：

```
    const obj = { 
        foo: { bar: [11, 22, 33, 44], baz: { bing: true, boom: 'Hello' } } 
    };
    // The third parameter is the number of spaces used to 
    // beautify the JSON output.
    JSON.stringify(obj, null, 4); 
    // =>"{
    // =>    "foo": {
    // =>        "bar": [
    // =>            11,
    // =>            22,
    // =>            33,
    // =>            44
    // =>        ],
    // =>        "baz": {
    // =>            "bing": true,
    // =>            "boom": "Hello"
    // =>        }
    // =>    }
    // =>}"
```

8.从数组中删除重复元素(数组去重)
通过使用通过使用集合语法和 Spread(展开)运算符，您可以轻松地从数组中删除重复项：

```
    const removeDuplicateItems = arr => [...new Set(arr)];
    removeDuplicateItems([42, 'foo', 42, 'foo', true, true]);
    //=> [42, "foo", true]
```


9.平铺多维数组
使用 Spread(展开)，可以很容易去平铺嵌套多维数组：


```
    const arr = [11, [22, 33], [44, 55], 66];
    const flatArr = [].concat(...arr); //=> [11, 22, 33, 44, 55, 66]
```

可惜，上面的方法仅仅适用于二维数组。不过，通过递归，我们可以平铺任意维度的嵌套数组。
    
```
    unction flattenArray(arr) {
    const flattened = [].concat(...arr);
    return flattened.some(item => Array.isArray(item)) ? 
    flattenArray(flattened) : flattened;
    }
    const arr = [11, [22, 33], [44, [55, 66, [77, [88]], 99]]];
    const flatArr = flattenArray(arr); 
    //=> [11, 22, 33, 44, 55, 66, 77, 88, 99]
```

就是这些啦！我希望这些巧妙的小技巧可以帮助你编写更好，更漂亮的 JavaScript 。

via: [css88.com](http://www.css88.com/archives/9868)
英文原文：[https://medium.freecodecamp.org/9-neat-javascript-tricks-e2742f2735c3](https://medium.freecodecamp.org/9-neat-javascript-tricks-e2742f2735c3)