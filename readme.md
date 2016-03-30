# adesk-x86客户端并发访问虚拟机工具

adesk-x86客户端本身是一台小瘦终端，上面安装了一个debian系统，并添加了我们adesk相关的软件。

下载一个debian的docker镜像，然后在这个镜像基础上，再安装上我们adesk相关的软件运行起来，就是一个adesk-x86容器了。

## adesk-x86客户端访问虚拟桌面资源的流程

![](http://200.200.0.36/86194/adeskx86-docker/raw/master/x86.png)

## 并发测试方法

认证保存会话信息 和 访问虚拟桌面资源 分两步

1. 执行run0.rb来获取用户登录后的session.conf文件

> `ruby run0.rb id1 id2 `
> 其中，id1 id2是用户名后面的数字，例如要保存user1..user100的登录信息，就运行`ruby run0 1 100`

2. 执行run1.rb来操作虚拟桌面资源

> 	ruby run1.rb id1 id2 opt rcid  n  time
> 其中，id1 id2是用户名后面的数字，opt为操作类型-q/-s/-r，rcid为资源ID，n为尝试此时，time为每次尝试的间隔时间

## 镜像

从debian镜像里直接安装adesk相关软件比较麻烦，暂时没找到好办法能直接从Dockerfile搞定，还需要人工安装一些依赖的软件，
还需修改adesk相关的部分脚本

详细的过程稍后更新



 
