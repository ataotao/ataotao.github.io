---
layout: post
title: 一些常用的git命令
categories: git
date: 2017-02-28 09:09:24
tags: 
    - git
---


查看所有分支的详细日志
======================
    git log --all --decorate --graph

它用线段表示分支的合并情况，还能看到标签：

    * commit ca0fd229e12d51a6429e6a91a094063bbc00ea56 (HEAD -> master, origin/master, origin/HEAD)
    | Author: Geoffrey Booth <webmaster@geoffreybooth.com>
    | Date:   Wed Feb 22 10:53:09 2017 -0800
    | 
    |     Update v2 NPM installation instructions
    |    
    *   commit a9bd53d77f075953170a820615b627ddeeb85ed0
    |\  Merge: 91e3f72 f8ce1a8
    | | Author: Jeremy Ashkenas <jashkenas@gmail.com>
    | | Date:   Wed Feb 22 13:16:44 2017 -0500
    | | 
    | |     Merge pull request #4448 from GeoffreyBooth/2-docs-on-master
    | |     
    | |     2 docs on master
    | |   
    | * commit f8ce1a8183f53a13c5bd14039654e0860c617dbd
    | | Author: Geoffrey <webmaster@geoffreybooth.com>
    | | Date:   Tue Feb 21 20:58:31 2017 -0800
    | | 
    | |     Teaser for CoffeeScript 2, link to 2 docs
    | |   
    | * commit cee1076e1d459b9aeeca735a2817410ef0a28bf0
    |/  Author: Geoffrey Booth <webmaster@geoffreybooth.com>

恢复一个文件
============

    git checkout <file-path>

清除工作目录中所有更改
===================

    git reset --hard && git clean -df

完全恢复工作目录
===================

    git reset --hard && git clean -dfx

它会使工作目录恢复成“全新”状态，即：刚clone之后的状态。

注意，它会清除所有的 ignored files。


（优雅地）回滚到原来的<commit>
===================

    git revert -n <commit>..HEAD
然后再commit即可。

这和 git reset 以及rebase都不同，它不修改历史（不删除原来的commit），而是用新的commit来抵消。这是很好的方式，大多数情况下都最好用revert来撤销。

姑且把它称之为“软回滚”吧。

（强硬地）回滚到原来的<commit>
===================

    git reset --hard <commit>
它会把HEAD指向这个commit，所以相当于把之后的commit全“删”了（不过并没真正删除，只有在定期的垃圾回收时刻才真正删除）。

不建议这样做。历史应该尽量保留，除非里面有敏感信息。

删除早期的commit以节省（远程或本地）空间
===================

    git rebase -i --root

几年以前的commits，你可能想把它们都删除了（不建议，但是如果有个大文件在里面占据了很大容量，而现在没有这个文件了，那这些commits就是个包袱）。这个方法不但会删掉commits，还会改变之后所有commits的hash值，所以请慎用！

运行后，会出来一编辑器，列出从第一个commit开始的所有commits，你只要把pick改成s，这个commit就会被“挤”掉（合并到上一个commit中）。我们举个例子，当运行此命令后，出现：

pick bbb2b0b init
pick 8ec6fb8 aaa
pick a1d84fc bbb
pick b36a6da ccc
你想删除第二个和第三个commit（也就是把它们都合并到第一个commit中），那就改成这样（千万不可直接删除行，否则可能会导致丢失不想删除的文件）：

pick bbb2b0b init
s 8ec6fb8 aaa
s a1d84fc bbb
pick b36a6da ccc
保存退出后，在最后还会出现一编辑器，是用来输入这个合并后的 commit message 的。

不过这还无法立即释放本地空间，如果要立即释放，要把所有东西从reflog里删除：

    git reflog expire --all --expire=now
然后再清理：

    git gc --prune=all
清空reflog和清理的步骤可以不做，push的时候远程仓库会自动删除这些已被删除的commit，然后别人clone或pull的时候也就不会下载这些多余文件了。

push的时候要这样：

    push -f
否则远程计算机会拒绝。因为我们已经修改或删除了已被push的commit，所以必须强制，才能让远程计算机也修改或删除这些commit。

列出变动的文件，但不包括详细内容
===================

    git diff --name-status
    git diff --name-status <commit> <commit>
当变化很大，详细内容有无数行的时候，就很好用。

显示某个commit中某个文件的内容
===================

    git show <commit>:<path>
例如 git show f6f207a:README.txt。

显示某个commit的更改
===================

    git show <commit>
    git show --name-status <commit>
和diff非常相似，但命令更简洁些。

打包备份
===================

    git bundle create <backup-file-path> --all
例如：

    git bundle create /backups/project1.bundle --all
Git就会在/backups目录下生成project1.bundle文件，里面包含着.git目录下的一切被引用的对象，包括所有commit、标签、分支。这个文件是压缩的，非常小。你可以定期备份，当要还原的时候，只要clone即可：

    git clone /backups/project1.bundle project1
（完）

原文链接：https://zhanzhenzhen.github.io/2017_02_26/


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
