---
layout: post
title: NodeJs设置环境变量的几种方式
categories: Nodejs
date: 2017-03-11 09:24:56
tags: 
    - Nodejs
    - 环境变量
    - js
---


方法一： 执行的时候设置
=====================================
    ```
    npm start --production
    // app.js
    console.log(process.env.NODE_ENV);
    production
    ```

方法二： package.json文件里面配置
=====================================

    ```
    "scripts": {
        "start": "set NODE_ENV = development && node ./bin/www",
        "dev": "set NODE_ENV = development && node app"
    },
    ```
