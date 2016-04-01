# ##
# run0.rb, v1.0 03/29/2016 mimi
# 
# 生成VDC用户名密码配置文件，并启动docker容器运行adesk-ec自动登录VDC，然后保存session信息到配置文件中
# 
# 使用方式：ruby run0.rb id1 id2 
#
# ### NOTE ###
#
# adesk-ec是x86上的EC客户端，是一个node.js程序，
# adesk-ec启动时，会读取/etc/adesk/vdc.conf来设置VDC的IP地址，然后连接VDC，
# 再读取/etc/adsek/user.conf来设置登录用户名密码等信息，如果该文件中设置了自动登录，就会自动使用该用户名密码自动登录，
# 登录成功后会将session信息在/run/adesk/session.conf文件中，
# 在VDC控制台 策略组管理->帐号控制->用户如果x分钟内未进行任何操作则自动断开连接 中可以配置这个session的有效期，最长30天
# ##



# ##
# 批量生成用户名密码等信息，写入到/home/sangfor/x86/users/user*.conf文件中
# 注意：需要提前在VDC控制台配置好所有的用户信息、资源、组策略和角色，开启自动登录
# 用户名格式为user1...user1000，密码为空
#
# @param [in] arr 用户名中的数字，例如要生成user1..user1000，此处的arr应该是[1..1000]
# @return null
# ##

def generate_users(arr)
  arr.each { |user|
    f = File.new("/home/sangfor/x86/users/user#{user}.conf","w")
    f.puts "password="
    f.puts "name=user#{user}"
    f.puts "autologin=1"
    f.close
  }
end


# ##
# 运行n个docker容器，每个容器加载对应的user.conf信息，
# 调用login_save_session.rb脚本，该脚本首先会调用adesk-autostart.sh来启动adesk-ec来登录，
# 然后将/run/adesk/session.conf文件session文件保存在/home/sangfor/x86/sessions/user*_session.conf文件中供后续使用
#
# @param [in] arr 用户名中的数字，例如要并发的登录user1..user1000，此处的arr应该是[1..1000]
# @return null
#
# ### NOTE ###
# 
# 由于adesk-ec会调用chromium来登录EC，消耗CPU较大，建议每次起50个docker容器，依次完成n个用户的登录
#
# ##

def run_docker(arr)
  t = []
  arr.each { |user|
   t<<Thread.new{ system("docker run -it --rm  -e DISPLAY " +
			 "-v /tmp:/tmp " +
			 "-v /etc/localtime:/etc/localtime "+
			 "-v /home/sangfor/x86/sessions:/sessions "+
			 "-v /home/sangfor/x86/login_save_session.rb:/login_save_session.rb "+
			 "-v /home/sangfor/x86/ui.js:/usr/local/share/adesk/ec/js/ui.js "+ 
			 "-v /home/sangfor/x86/vdc.conf:/etc/adesk/vdc.conf " +
			 "-v /home/sangfor/x86/users/user#{user}.conf:/etc/adesk/user.conf "+
			 " -v /tmp/.X11-unix:/tmp/.X11-unix " +
			 " mimi/x86:1.6 ruby /login_save_session.rb ")}
  }
   
  t.each {|tt|
    tt.join
  }
end

# ##
# 处理外部输入参数并调用run_docker函数
# ##

def main
 
  system("xhost +")

  # 停止并删除之前的容器
  system("docker ps -a | grep 'ago' | awk '{print $1}' | xargs --no-run-if-empty docker stop")
  system("docker ps -a | grep 'ago' | awk '{print $1}' | xargs --no-run-if-empty docker rm")

  # 删除/tmp/目录下的临时文件
  system("rm -rf /tmp/*.dmp")
  system("rm -rf /tmp/pulse*")
  system("rm -rf /tmp/*.uds")

  id1 = ARGV[0].nil? ? 1 : ARGV[0].to_i
  id2 = ARGV[1].nil? ? 1 : ARGV[1].to_i

  user_arr = id1..id2
  user_arr = user_arr.to_a

  # 先生成user.conf文件
  generate_users(user_arr)

  # 开启容器
  begin 
    run_docker(user_arr)
  rescue => err
    puts err
  end

end


main
puts "run0.rb end"

