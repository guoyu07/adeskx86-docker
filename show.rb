# ##
# show.rb, v1.0 03/29/2016 mimi
#
# 统计并显示run0.rb和run1.rb运行后的日志内容
#
# ##

# ##
#
# 这个函数暂时没用了
#
# ##
def func(file)
	if not File.exist?(file)
		return
	end
	f = IO.readlines(file)
	puts "#{file} has #{f.size} logs"
	tmp = []
	f.each {|ff|
		tmp.push ff.split(":")[0]
	}
	tmp = tmp.uniq
	puts "#{file} has real #{tmp.size} logs"
end

# ##
# 
# 统计adesk登录的日志信息，包括总共多少客户端登录，登录成功和登录失败的个数，并打印到屏幕
# 
# @param [in] file 日志文件路径
# @return null
# 
# ##
def func1(file)
	return 	if not File.exist?(file)
	all_num = 0
	ok_num = 0
	f = IO.readlines(file)
	f.each {|ff|
		if ff.start_with?("[Host]")
			all_num +=1
			ok_num += 1 if ff.include?("[Result]true")
		end
	}
	puts ""
    puts "*"*10*14
    puts "* There are #{all_num} clients login, #{ok_num} login success, #{all_num-ok_num} fail"
	puts "* (See details: 'cat #{file}')"	
	puts "*"*10*14
	puts ""
end

# ##
# 
# 统计adesk-client运行的日志信息，包括每次操作总共多少客户端，操作成功和操作失败的个数，
# 第一个容器开始执行操作的时间和最后一个容器操作结束的时间差，
# 所有容器执行操作消耗的总时间的平均值，
# 执行操作最快和最慢的容器信息，并打印到屏幕
# 
# ##
#
# @param [in] file 日志文件路径
# @return null
# 
# ##

def func2(file)
	if not File.exist?(file)
		return
	end
	all_num = 0
	ok_num = 0
	fail_num = 0
	ok_hash = {}
	f = IO.readlines(file)
	f.each { |ff|
		ff = ff.chomp
		if ff.start_with?("[Host]")
			all_num += 1
			if ff.include?("[Result]true")
				ok_num += 1
				i,j,k,m,n = ff.gsub("[","").gsub("]",":").split(", ")
                        	ok_hash["#{i.split(':')[1]}"] = {"#{j.split(':')[0]}" => "#{j.split(':')[1]}", "#{k.split(':')[0]}" => "#{k.split(':')[1]}", "#{m.split(':')[0]}" => "#{m.split(':')[1]}", "#{n.split(':')[0]}" => "#{n.split(':')[1]}"}
			else
				fail_num += 1
			end
		end
	}

	start_times = ok_hash.sort_by{|k,v| v["StartTime"]}
	end_times   = ok_hash.sort_by{|k,v| v["EndTime"]}
	user_times = ok_hash.sort_by{|k,v| v["EndTime"].split("-")[0].to_i*3600 + v["EndTime"].split("-")[1].to_i*60 + v["EndTime"].split("-")[2].to_i - v["StartTime"].split("-")[0].to_i*3600 - v["StartTime"].split("-")[1].to_i*60 - v["StartTime"].split("-")[2].to_i}
	user_all_time = 0
	ok_hash.each { |k,v|
		t = v["EndTime"].split("-")[0].to_i*3600 + v["EndTime"].split("-")[1].to_i*60 + v["EndTime"].split("-")[2].to_i - v["StartTime"].split("-")[0].to_i*3600 - v["StartTime"].split("-")[1].to_i*60 - v["StartTime"].split("-")[2].to_i	
		user_all_time += t
	}
	puts ""	
	puts "*"*10*14		
	#puts "* There are #{all_num} clients running, #{ok_num} query success, #{fail_num} fail"  
	puts "* 总共有 #{all_num} 个客户端运行, 其中 #{ok_num} 执行结果是成功, #{fail_num} 执行结果是失败。"  
	if ok_num == 0 
		puts ""
	else	
		all_time = end_times[-1][1]['EndTime'].split("-")[0].to_i*3600 + end_times[-1][1]['EndTime'].split("-")[1].to_i*60 + end_times[-1][1]['EndTime'].split("-")[2].to_i - start_times[0][1]['StartTime'].split("-")[0].to_i*3600 - start_times[0][1]['StartTime'].split("-")[1].to_i*60 - start_times[0][1]['StartTime'].split("-")[2].to_i
		#puts "* Success Client used time: [AllTime]#{all_time}s, [AVG]#{user_all_time*1.0/ok_num}s" 
		puts "* 所有执行结果为成功的容器，从第一个容器开始执行，到最有一个容器执行完成，总共消耗时间为: [AllTimeUsed]#{all_time}秒。(容器并发启动是有一些时间间隔的)"
		puts "* 所有执行结果为成功的容器，执行操作所消耗的总时间为: [AllTimeExe]#{user_all_time}秒， 平均每个容器执行操作所消耗的时间为: [AVG]#{user_all_time*1.0/ok_num}秒" 
		#puts "* Success Client start from #{start_times[0][1]['StartTime']} to #{start_times[-1][1]['StartTime']}"
		puts "* 执行结果为成功的容器中，最早开始执行的容器是 #{start_times[0][1]}"
		puts "* 执行结果为成功的容器中，最晚开始执行的容器是 #{start_times[-1][1]}"
		#puts "* Success Client End from #{end_times[0][1]['EndTime']} to #{end_times[-1][1]['EndTime']}"
		puts "* 执行结果为成功的容器中，最早执行完成的容器是 #{end_times[0][1]}"
		puts "* 执行结果为成功的容器中，最晚执行完成的容器是 #{end_times[-1][1]}"
		#puts "* Success Query Time slowest is #{user_times[-1]}"
		puts "* 执行结果为成功的容器中，执行速度最快的容器是 #{user_times[0]}"
		puts "* 执行结果为成功的容器中，执行速度最慢的容器是 #{user_times[-1]}"
		#puts "* Success Query Time fastest is #{user_times[0]}"
		
	end
	#puts "* (See details: 'cat #{file}')"
	puts "* (查看详细日志请运行: 'cat #{file}')"
	puts "*"*10*14
	puts ""
end

#func("/tmp/openrc.log")
#func("/tmp/queryVDesktop.log")
#func("/tmp/qvdfailedfn.log")
#func("/tmp/qvdsuccessfn.log")
#func("/tmp/spice.log")
#func("/tmp/failed.log")
func1("/tmp/adesk_login.log")
func2("/tmp/aclient.log") 
