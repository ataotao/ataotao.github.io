---
layout: post
title: React内联SVG背景图的实现
categories: React
date: 2018-10-24 11:43:33
tags: 
    - React
    - SVG
    - 内联SVG
---

内联SVG背景图像在React.js中的实现
=====================================

遇到一个需求，后台返回验证码是一个内联的svg字符串，如果通过 ```dangerouslySetInnerHTML={{__html: captchaSvg }}``` 直接插入到页面，不方便调整尺寸;

- 背景图像的实现方式

```
    const captchaSvg = window.encodeURIComponent(captchaImg);
    <div style={backgroundImage:`url(data:image/svg+xml;charset=UTF-8,${captchaSvg})`, backgroundSize: '100% 100%', width:200, height:50} />
```