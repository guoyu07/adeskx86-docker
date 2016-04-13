# ##
# login_save_session.rb, v1.0 03/29/2016 mimi
# 
# 此脚本在容器内执行。
# 脚本会调用x86系统中的adesk-autostart.sh来拉起adesk-ed,并完成自动登录
# 登录完成后，将生成的/run/adesk/session.conf会话信息保存在容器外的/home/sangfor/x86/sessions/目录中供后续使用
# 执行结果会保存在/tmp/adesk_login.log中
# 注意：/tmp/adesk_login.log文件是追加写，不会自动删除
#
# ##


host = `hostname`.chomp
user = `cat /etc/adesk/user.conf |grep name=`.chomp.split("=")[1]


time0 = `date +%H-%M-%S`.chomp # 记录登录开始的时间

result = false # 保存登录结果 

begin
	system("adesk-autostart.sh") # 启动EC

	timeout = 200
	while timeout > 0
          session = `cat /run/adesk/session.conf |grep username`
          if session.include?("#{user}")
				`cp /run/adesk/session.conf /sessions/#{user}_session.conf`
				result = true
                break
          end
          timeout = timeout - 1
          system("adesk-autostart.sh") if 100 == timeout # 如果等了50秒还没有登录成功，有可能页面出错停了，这时应该重新拉起客户端
          sleep 0.5 # 由于并发登录VDC不是本次测试重点，而且并发登录会消耗大量CPU资源，暂时将登录VDC和开启资源的操作分开执行
	end
rescue => err
	puts err
end

time1 = `date +%H-%M-%S`.chomp # 记录登录完成的时间

log = File.new("/tmp/adesk_login.log", "a")
log.puts "---"*10 + Time.new.to_s + "---"*10
log.puts "[Host]" + host +  ", [StartTime]" + time0 + ", [EndTime]" + time1 + ", [Result]" + result.to_s + ", [WaitTime]" + ((200-timeout)*0.5).to_s
log.puts "[User]#{user}, [CMD]adesk-autostart.sh"
log.close

