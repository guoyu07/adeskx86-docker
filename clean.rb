# 清空容器运行期间产生的临时文件等
system("rm -rf /tmp/*.dmp")
system("rm -rf /tmp/pulse*")
system("rm -rf /tmp/*.log")
system("rm -rf /tmp/*.uds")
system("rm -rf /tmp/.org.chromium*")
