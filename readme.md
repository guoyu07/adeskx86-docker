# adesk-x86客户端并发访问虚拟机工具

adesk-x86客户端本身是一台小瘦终端，上面安装了一个debian系统，并添加了我们adesk相关的软件。

下载一个debian的docker镜像，然后在这个镜像基础上，再安装上我们adesk相关的软件运行起来，就是一个adesk-x86容器了。

## adesk-x86客户端访问虚拟桌面资源的流程

![](http://200.200.0.36/86194/adeskx86-docker/raw/master/x86.png)

## 并发测试方法

0. 配置vdc.conf里的VDC信息

> 修改vdc.conf文件里的各种ip地址
> VDC上必须先创建好user1..user1000用户，这些用户关联两个独享桌面，一个是你要测试打开的资源，另一个是临时的，为了避免单一资源自动打开的情况

认证保存会话信息 和 访问虚拟桌面资源 分两步

1. 执行run0.rb来获取用户登录后的session.conf文件

> `ruby run0.rb id1 id2 `
> 其中，id1 id2是用户名后面的数字，例如要保存user1..user100的登录信息，就运行`ruby run0.rb 1 100`

2. 执行run1.rb来启动容器，容器中的tcpserver会等待tcpclient发消息，来操作虚拟桌面资源

> `ruby run1.rb id1 id2`
> 其中，id1 id2是用户名后面的数字

3. 执行tcpclient来给所有的容器发消息

> `ruby test/httpclient.rb opt rcid  n  time`
> 其中，opt为虚拟机操作类型，如-q/-s/-r分别表示启动/关闭/重置, rcid为资源ID，是VDC上的资源ID，可以从VDC控制台按F12看到资源ID， n为尝试次数（只对-q有效），time为尝试间隔时间（只对-q有效）

## 镜像

从debian镜像里直接安装adesk相关软件比较麻烦，暂时没找到好办法能直接从Dockerfile搞定，还需要人工安装一些依赖的软件，
还需修改adesk相关的部分脚本

详细的过程稍后更新



 
