---
layout: post
title: Math对象技巧，Math.max，Math.min获取数组最大值和Math.random随机数
categories: Javascript
date: 2017-03-3 09:39:00
tags: 
    - Math对象
    - Javascript
    - 随机数
    - Math.random
    - Math.max
    - Math.min
---


Math对象技巧，Math.max，Math.min获取数组最大值和Math.random随机数
======================

#Math.max，Math.min 求最大值、最小值

    //最大值 最小值
    var max = Math.max(3, 54, 32, 16);
    console.log(max); //54
    var min = Math.min(3, 54, 32, 16);
    console.log(min); //3

    var values = [1, 2, 3, 4, 5, 6, 7, 8];
    var arrMax = Math.max.apply(Math, values);
    var arrMin = Math.min.apply(Math, values);
    console.log(arrMax); //8
    console.log(arrMin); //1

#Math.ceil Math.floor Math.round舍入方法

    // 舍入方法

    /*
    * Math.ceil()执行向上舍入，即它总是将数值向上舍入为最接近的整数；
    * Math.floor()执行向下舍入，即它总是将数值向下舍入为最接近的整数；
    * Math.round()执行标准舍入，即它总是将数值四舍五入为最接近的整数（这也是我们在数学课
    */

    console.log(Math.ceil(25.9)); //26
    console.log(Math.ceil(25.5)); //26
    console.log(Math.ceil(25.1)); //26

    console.log(Math.round(25.9)); //26
    console.log(Math.round(25.5)); //26
    console.log(Math.round(25.1)); //25

    console.log(Math.floor(25.9)); //25
    console.log(Math.floor(25.5)); //25
    console.log(Math.floor(25.1)); //25

#Math.random()随机数

    // 套用下面的公式，就可以利用Math.random()从某个整数范围内随机选择一个值。
    //var 值 = Math.floor(Math.random() * 可能值的总数 + 第一个可能的值)

    //选择一个1到10 之间的数值
    var num1 = Math.floor(Math.random() * 10 + 1);

    // 选择一个介于2 到10 之间的值
    var num2 = Math.floor(Math.random() * 9 + 2);

    // 整合方法
    function selectFrom(lowerValue, upperValue) {
        var choices = upperValue - lowerValue + 1;
        return Math.floor(Math.random() * choices + lowerValue);
    }
    var num = selectFrom(2, 10);
    console.log(num); // 介于 2 和10 之间（包括 2 和 10）的一个数值

#Math.random()应用

    // 函数selectFrom()接受两个参数：应该返回的最小值和最大值。而用最大值减最小值再加1 得到了可能值的总数，然后它又把这些数值套用到了前面的公式中。
    // 这样，通过调用selectFrom(2,10)就可以得到一个介于2 和10 之间（包括2 和10）的数值了。
    // 利用这个函数，可以方便地从数组中随机取出一项
    var colors = ["red", "green", "blue", "yellow", "black", "purple", "brown"];
    var color = colors[selectFrom(0, colors.length - 1)];
    console.log(color); // 可能是数组中包含的任何一个字符串
