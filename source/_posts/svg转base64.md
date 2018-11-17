---
layout: post
title: svg转base64，svg, png, jpeg
categories: Javascript
date: 2018-11-17 11:57:00
tags: 
    - svg
    - base64
    - svg转换
---
### svg转换为base64，文件格式会变大, 浏览器解码也会消耗一定的资源，不建议使用，但是有需要的时候，可以参见下面方式进行转换

```
    <!DOCTYPE html>
    <html>

    <head>
    <title>svgAsHtml</title>
    <meta charset="utf-8">
    <script type="text/javascript" src="https://cdn.bootcss.com/d3/3.5.17/d3.js"></script>
    </head>

    <body>
    <svg width="300" height="170" class="mysvg" viewbox="0 0 300 170" xmlns="http://www.w3.org/2000/svg" version="1.1">

        <path d="M100 10 L50 60 L150 60 Z" stroke="#FB716D" stroke-width="3" fill="#FBA28A" />
        <rect x="55" y="61" width="90" height="100" fill="#F3C392"></rect>
        <rect x="85" y="97" width="30" height="30" stroke="#f6f6f6" stroke-width="3" fill="#B2DBCB" />
        <line x1="85" x2="115" y1="112" y2="112" stroke="#f6f6f6" stroke-width="3" fill="transparent" />
        <line x1="100" x2="100" y1="97" y2="127" stroke="#f6f6f6" stroke-width="3" fill="transparent" />
        <g transform="translate(150,-18)">
        <path d="M 30 160 A 30 35, 0, 1, 1, 60 160 L 45 160 Z" fill="#7ACB9E"></path>
        <rect x="40" y="160" width="10" height="22" fill="#EBBEA6" />
        </g>

        <g transform="translate(187,-18)">
        <path d="M70 100 L40 160 L100 160 Z" fill="#7ACB9E" />
        <rect x="65" y="160" width="10" height="22" fill="#EBBEA6" />
        </g>

    </svg>
    <script type="text/javascript">
        var mySvg = document.querySelector(".mysvg");
        var svgCon = mySvg.outerHTML;
        //svg转base64;
        var href = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgCon)));
        var image = new Image();
        image.src = href;

        //添加svg转base64格式的图片
        var svgImg = document.createElement('img');
        svgImg.src = href;
        document.body.appendChild(svgImg)

        //下载svg图片
        var svgLink = document.createElement('a');
        svgLink.download = "image.svg";
        svgLink.href = href;
        svgLink.innerHTML = '下载svg图片'
        document.body.appendChild(svgLink);

        image.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);


        //svg转png的base64编码;
        var imgDataUri = canvas.toDataURL('image/png');
        console.log(imgDataUri);
        //添加svg转base64格式的png图片
        var pngImg = document.createElement('img');
        pngImg.src = imgDataUri;
        document.body.appendChild(pngImg)

        //下载png图片
        var a = document.createElement('a');
        a.download = "image.png";
        a.href = imgDataUri;
        a.innerHTML = '下载png图片'
        document.body.appendChild(a);

        //svg转jpg的base64编码;
        var jpgDataUri = canvas.toDataURL('image/jpeg', 1);
        console.log(jpgDataUri)


        //添加svg转base64格式的jpg图片
        var jpgImg = document.createElement('img');
        jpgImg.src = jpgDataUri;
        document.body.appendChild(jpgImg)

        //下载jpg图片
        var a = document.createElement('a');
        a.download = "image.jpeg";
        a.href = jpgDataUri;
        a.innerHTML = '下载jpg图片'
        document.body.appendChild(a);
        }
    </script>
    </body>

    </html>
```