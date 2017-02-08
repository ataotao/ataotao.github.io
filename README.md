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

# 在github上建立gh-pages分支

- 为什么要建立gh-pages分支呢，因为github项目的静态页面解析需要这个名字的分支

    //进入到你想要上传的文件夹下：
    cd text

    //git初始化
    git init

    //创建gh-pages分支
    git checkout --orphan gh-pages

    //添加文件到暂存区
    git add .

    //添加信息
    git commit -m "This is add message"

    //或者不写上面的git add .直接写 git commit -a -m \"First pages commit\"这个-a参数我查了之后说是对git add .的替代，但我不建议大家使用。

    //添加仓库
    git remote add origin git@github.com:username/project.git

    //部署你的项目到github
    git push origin gh-pages

# git命令

    //查看分支
    git branch
    git branch -a //本地分支
    git branch -r //远程分支

    //建立分支
    git branch 分支名

    //切换分支
    git checkout 分支名

    //拉取
    git pull
    git pull origin gh-pages
    git pull origin master

    //提交
    git commit -m "This is add message"

    //推送
    git push origin gh-pages
    git push origin master

    //add 全部
    git add -A
    //git add . ：他会监控工作区的状态树，使用它会把工作时的所有变化提交到暂存区，包括文件内容修改(modified)以及新文件(new)，但不包括被删除的文件。
    //git add -u ：他仅监控已经被add的文件（即tracked file），他会将被修改的文件提交到暂存区。add -u 不会提交新文件（untracked file）。（git add --update的缩写）
    //git add -A ：是上面两个功能的合集（git add --all的缩写）

    //本地的同步成远程的文件
    git reset --hard origin

    //恢复某个文件
    git checkout xxx.js
