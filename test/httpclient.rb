require 'socket'


def func(ip, a)
	s = TCPSocket.new ip, 2000
	s.puts a
	while line = s.gets # Read lines from socket
	  puts line         # and print them
	end

	s.close   
end

logfile = File.new("/tmp/httpclient.log", "a")

all_ip = IO.readlines("/tmp/ip.log")

puts "There are #{all_ip.size} server."
logfile.puts "There are #{all_ip.size} server."

t1 = Time.new
t = []
all_ip.each{ |ip|
	t << Thread.new{
		func(ip.chomp, "-s 1")
	}
}

t.each { |tt|
	tt.join
}
t2 = Time.new

puts "use time: #{t2-t1}"
logfile.puts "[StartTime]#{t1.strftime "%Y-%m-%d %H:%M:%S"}, [EndTime]#{t2.strftime "%Y-%m-%d %H:%M:%S"}, [UseTime]#{t2-t1}"
logfile.close