# ##
# aclient.rb, v1.0 03/29/2016 mimi
# 
# 调用x86系统中的adesk-client工具来操作虚拟机资源
# 
# 使用方式：ruby aclient.rb -q rcid n time 尝试n次，每次间隔time秒，开启资源ID为rcid的虚拟机
#           ruby aclient.rb -r rcid 重置资源ID为rcid的虚拟机
#           ruby aclient.rb -s rcid 关闭资源ID为rcid的虚拟机
#
# ### NOTE ###
# 
# adesk-client是x86盒子中的一个小工具，可以操作虚拟机资源，支持的操作类型有：
#   1. query 查询虚拟机状态，若虚拟机为关机状态，则请求VDC去开机，返回值中会包含虚拟机的状态值
#      使用方法：adesk-client vdesktop -q -i rcid -t timeout
#   2. reset 重置虚拟机
#      使用方法：adesk-client vdesktop -r -i rcid -t timeout
#   3. shutdown 关闭虚拟机
#      使用方法：adesk-client vdesktop -s -i rcid -t timeout
#   其中timeout 默认为15s
#
# ##

require 'open3'

# ##
# 调用adeck-client程序来操作资源
# 
# @param [in] opt 操作类型： -q 查询/开机，-r 重置虚拟机，-s 关机
# @param [in] rcid 资源ID
# @param [in] n 重试次数
# @param [in] time 每次重试的间隔时间
# @return {"cmd": 执行的命令， "result": 命令执行结果， "out": 命令stdout输出信息， "err"：命令stderr输出信息， "time"：命令重试次数}
# ##

def run_aclient(opt, rcid, n, time)
	rcid = rcid.to_i
	n = n.to_i
	time = time.to_f
	nn = n
	out = ""
	err = ""
	if opt == "-r" || opt == "-s"
		stdin,stdout,stderr,wait_thr = Open3.popen3("adesk-client", "vdesktop", "#{opt}", "-i", "#{rcid}")
                out = stdout.gets(nil)
                stdout.close
                err = stderr.gets(nil)
                stderr.close
                if  out.include?("\"result\":\"1\"") 
                        return {"cmd" => "adesk-client vdesktop #{opt} -i #{rcid}", "result" => true, "out" => out, "err" => err, "time" => nn-n}
                end
	else	
	    while n > 0
		n = n - 1
		stdin,stdout,stderr,wait_thr = Open3.popen3("adesk-client", "vdesktop", "#{opt}", "-i", "#{rcid}")
		out = stdout.gets(nil)
		stdout.close
		err = stderr.gets(nil)
		stderr.close
		if out && (out.include?("\"res_state\": 3") )
			return {"cmd" => "adesk-client vdesktop #{opt} -i #{rcid}", "result" => true, "out" => out, "err" => err, "time" => nn-n}
		end
		sleep time # 此处sleep会造成时间误差，误差范围为0~time秒
	    end
	end
	return {"cmd" => "adesk-client vdesktop #{opt} -i #{rcid}", "result" => false, "out" => out, "err" => err, "time" => nn-n}
end


# ##
# 处理外部输入参数并调用run_aclient函数
# 执行结果按格式会保存到/tmp/aclient.log文件中
# 注意：/tmp/aclient.log文件是追加写，不会删除
# ##

def main
	opt  = ARGV[0].nil? ? "-q" : ARGV[0]
	rcid = ARGV[1].nil? ? 0    : ARGV[1]
	n    = ARGV[2].nil? ? 0    : ARGV[2]
	time = ARGV[3].nil? ? 0    : ARGV[3]

	# host为docker容器的ID，用于区分不同的客户端
	host = `hostname`.chomp
	user = `cat /etc/adesk/user.conf |grep name=`.chomp

	time1 = ""
	time2 = ""
	ret = {}

	time1 = `date +%H-%M-%S`.chomp #记录开始执行adesk-client工具的开始时间
	ret = run_aclient(opt, rcid, n, time)
	time2 = `date +%H-%M-%S`.chomp #记录adesk-client工具退出时的时间

	log = File.new("/tmp/aclient.log", "a")
	log.puts "---"*10 + Time.new.to_s + "---"*10
	# 下面这条打印信息不要修改，后面日志分析会检查里面的标记
	log.puts "[Host]" + host +  ", [StartTime]" + time1 + ", [EndTime]" + time2 + ", [Result]" + ret["result"].to_s + ", [RetryTimes]" + ret["time"].to_s
	log.puts "[User]#{user}, [CMD][#{ARGV}] #{ret['cmd'].to_s}, [INTERVAL]#{time}"
	log.puts "[Stdout] " 
	log.puts ret["out"].to_s
	log.puts "[Stderr] " 
	log.puts ret["err"].to_s
	log.close
end

main