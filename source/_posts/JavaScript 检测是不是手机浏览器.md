---
layout: post
title: 通过MessageChannel实现深拷贝
categories: Javascript
date: 2018-10-24 17:32:00
tags: 
    - Javascript
    - 深拷贝
    - MessageChannel
---


### 如果拷贝的对象不包含函数，可以使用 MessageChannel来实现

Channel Messaging API的Channel Messaging接口允许我们创建一个新的消息通道，并通过它的两个MessagePort 属性发送数据。

```
    const arr = ['arr'];
    const obj = {
      a: 1,
      s: undefined,
      r: null,
      b: {
        c: arr
      }
    };

    function structuralClone(oldData, callback) {
      const { port1, port2 } = new MessageChannel();
      port2.onmessage = ev => callback(ev.data);
      port1.postMessage(oldData);
    }

    // 注意该方法是异步的
    // 可以处理 undefned 和循环引用对象
    structuralClone(obj, function (newData) {
      console.log('newData === obj', newData === obj, newData);
      // newData.b.c与arr的引用关系被解除了
      console.log('newData.b.c === arr', newData.b.c === arr, newData.b.c);
      console.log('obj.b.c  === arr', obj.b.c === arr, obj.b.c);
    });

```