# ##
# run1.rb, v1.0 03/29/2016 mimi
# 
# 启动docker容器运行adesk-client工具来操作虚拟机
# 
# 使用方式：ruby run1.rb id1  id2  opt rcid  n  time
#           ruby run1.rb  1   100  -q    1   60   5   使用user1..user100，尝试60次，每次间隔5秒，开启资源ID为1的虚拟机
#           ruby run1.rb  1   100  -s    1            使用user1..user100，关闭资源ID为1的虚拟机
#           ruby run1.rb  1   100  -r    1            使用user1..user100，重置资源ID为1的虚拟机
#
# ### NOTE ###
#
# adesk-client工具需要读取客户端/run/adesk/session.conf文件中的session信息才能成功与VDC通信
# 所以，需要先执行run0.rb来保存对应的session.conf然后再运行本脚本
#
# ##



# ##
# 运行n个docker容器，每个容器加载对应的session.conf信息，
# 调用aclient.rb脚本，该脚本首先会调用adesk-client工具循环操作虚拟机，直到操作成功或者超时
#
# @param [in] arr 用户名中的数字，例如要并发的登录user1..user1000，此处的arr应该是[1..1000]
# @return null
#
# ### NOTE ###
# 
# adesk-client不会消耗太多CPU资源，可以并发启动多个容器来执行（具体支持的并发数量没有测试过）
#
# ##

def run_docker(arr, opt, rcid, n, time)
  t = []
  arr.each { |user|
   t<<Thread.new{ system("docker run -it --rm  -e DISPLAY "+  
			 "-v /etc/localtime:/etc/localtime " +  
			 "-v /tmp:/tmp "+ 
       "-v /home/sangfor/x86/test/:/test/ " + 
			 "-v /home/sangfor/x86/sessions/user#{user}_session.conf:/run/adesk/session.conf "+ 
			 "-v /home/sangfor/x86/aclient.rb:/aclient.rb "+ 
			 "-v /home/sangfor/x86/ui.js:/usr/local/share/adesk/ec/js/ui.js "+  
			 "-v /home/sangfor/x86/vdc.conf:/etc/adesk/vdc.conf "+ 
			 "-v /home/sangfor/x86/users/user#{user}.conf:/etc/adesk/user.conf "+ 
			 "-v /tmp/.X11-unix:/tmp/.X11-unix "+  
			 "mimi/x86:1.6 " +
			 "ruby /test/httpserver.rb")}
  }
  t.each {|tt|
    tt.join
  }
end


# ##
# 处理外部输入参数并调用run_docker函数
# ##

def main

  # 停止并删除之前的容器
  system("docker ps -a | grep 'ago' | awk '{print $1}' | xargs --no-run-if-empty docker stop")
  system("docker ps -a | grep 'ago' | awk '{print $1}' | xargs --no-run-if-empty docker rm")

  # 删除/tmp/目录下的临时文件
  system("rm -rf /tmp/*.dmp")
  system("rm -rf /tmp/pulse*")
  system("rm -rf /tmp/*.uds")

  id1  = ARGV[0].nil? ? 1    : ARGV[0].to_i
  id2  = ARGV[1].nil? ? 1    : ARGV[1].to_i
  opt  = ARGV[2].nil? ? "-q" : ARGV[2].to_s
  rcid = ARGV[3].nil? ? 0    : ARGV[3].to_i
  n    = ARGV[4].nil? ? 0    : ARGV[4].to_i
  time = ARGV[5].nil? ? 0    : ARGV[5].to_i


  user_arr = id1..id2
  user_arr = user_arr.to_a

  begin 
    run_docker(user_arr, opt, rcid, n, time)
  rescue => err
    puts err
  end
end

main

puts "run1.rb end"
