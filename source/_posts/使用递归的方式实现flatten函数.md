---
layout: post
title: 使用递归的方式实现flatten函数
categories: Javascript
date: 2019-3-20 14:46:00
tags: 
    - Javascript
    - flatten
    - 递归
---


### 方法一

```
    var arr = [1, 2, 3, [4, 5, [[6, [7, [8]]]]],[6, [7, [8]]]];
    function flatten(array) {
        let init = [];
        return (function _flatten(array) {
            for (let i = 0; i < array.length; i++) {
                const item = array[i];
                if (Object.prototype.toString.call(item) === '[object Array]') {
                    init.concat(_flatten(item));
                } else {
                    init.push(item);
                }
            }
            return init;
        }(array));
    }
    console.log(flatten(arr));

```

### 方法二 es6实现

```
    const arr = [1, 2, 3, [4, 5, [[6, [7, [8]]]]],[6, [7, [8]]]];
    const flatten = array => array.reduce((init, item) => (Array.isArray(item) ? [...init, ...flatten(item)] : [...init, item]), []);
    console.log(flatten(arr));

```