GitHub Pages + HEXO 搭建blog
=============================

# 安装过程

## 第一步:
    npm install hexo-cli -g
    hexo init blog
    cd blog
    npm install
    hexo server  //hexo s

## 执行:
    hexo clean
    hexo generate //hexo g
    hexo deploy   //hexo d

## 一些常用命令：

    hexo new"postName" #新建文章

    hexo new page"pageName" #新建页面

    hexo generate #生成静态页面至public目录

    hexo server #开启预览访问端口（默认端口4000，'ctrl + c'关闭server）

    hexo deploy #将.deploy目录部署到GitHub

    hexo help # 查看帮助

    hexo version #查看Hexo的版本

# 使用Hexo的内建归档categories，应该可以满足题主所述要求

1.第一步：生成post（文章）时默认生成categories配置项：在根目录下scaffolds/post.md中，添加一行categories:。同理可应用在page.md和photo.md，示例如下：

    title: {{ title }}
    date: {{ date }}
    tags:
    categories:
    # 此处为添加内容 随笔
    ---

2.第二步：在实际写作时，在开头进行categories配置。例如：

    title: Hello，World!你好，世界！
    date: 2014-01-21 23:33:02
    tags: 写作 
    categories: 随笔 # 配置categories

- [详细操作查看](https://www.zhihu.com/question/33324071)


# tags设置
    tags: 
        - js 
        - 写作

# 其他配置说明
    layout        Layout        post 或 page    

    title         文章的标题    

    date          创建日期        文件的创建日期    

    updated       修改日期        文件的修改日期    

    comments      是否开启评论     true    

    tags          标签    

    categories    分类    

    permalink     url中的名字     文件名 