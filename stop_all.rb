# 停止并删除之前的容器
system("docker ps -a | grep 'ago' | awk '{print $1}' | xargs --no-run-if-empty docker stop")
system("docker ps -a | grep 'ago' | awk '{print $1}' | xargs --no-run-if-empty docker rm")
