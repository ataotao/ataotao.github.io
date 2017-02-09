---
layout: post
title: Javascript递归方式完美实现对象、数组深拷贝
categories: Javascript
date: 2017-02-09 09:03:12
tags: 
    - Javascript
    - 深拷贝
    - js
---

##### 对象拷贝方式有很多种，但是如何能够不抛弃对象的``constructor``，而且相互对象的引用也会完整copy，不受影响，请看下面代码：
``深拷贝``：对于深拷贝，针对成员变量存在指针的情况，不仅仅是简单的指针赋值，而是**重新分配内存空间**
``浅拷贝``：只是拷贝了指针，使得两个指针指向同一个地址

知乎上有一个答案，这个方法可以拷贝对象和数组

    ```
    var cloneObj = function(obj){
        var str, newobj = obj.constructor === Array ? [] : {};
        if(typeof obj !== 'object'){
            return;
        } else if(window.JSON){
            str = JSON.stringify(obj), //系列化对象
            newobj = JSON.parse(str); //还原
        } else {
            for(var i in obj){
                newobj[i] = typeof obj[i] === 'object' ? 
                cloneObj(obj[i]) : obj[i]; 
            }
        }
        return newobj;
    };

    ```

这个方法``遇到环或者是其他类型的数据``就咯屁了，网上大部分深克隆的答案都没考虑``循环引用问题以及不能toJSON的对象``问题。
自虐一下，放出一个完美方案，虽然某些类型不太可能遇到，采用这方案更加不容易出错

    ```
    //完美解决方案
    var http = require('http');

    function deepClone(initialObj, finalObj) {
        return _deepClone(initialObj, finalObj, {
        k: [],
        v: []
        });
    }

    function _deepClone(initialObj, finalObj, conflict) {
        var i;
        if (initialObj && typeof initialObj === "object" && (i = [Object, Array].indexOf(initialObj.constructor)) != -1) {
        if (!finalObj) {
            finalObj = initialObj.constructor === Array ? [] : {};
        }
        if (conflict) {
            i = conflict.k.indexOf(initialObj);
            if (i != -1) {
            return conflict.v[i];
            }
            conflict.k.push(initialObj);
            conflict.v.push(finalObj);
        }
        for (var key in initialObj) {
            finalObj[key] = _deepClone(initialObj[key], finalObj[key], conflict);
        }
        return finalObj;
        }
        return initialObj;
    }

    //测试数据
    var a = {
        "n": 1
    };
    a.x = a; //环引用

    var b = deepClone(a);

    console.log(b, b.x === b);  //查看拷贝对象，x属性为环引用，一直循环

    //各种不同类型数据拷贝
    console.log(deepClone(1));  
    console.log(deepClone(new Date()));  
    console.log(deepClone(/regex/i));
    console.log(deepClone(false));
    console.log(deepClone(undefined));
    //测试数据 end
    ```

