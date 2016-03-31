require 'socket'


def func(ip, a, n = 5, time = 6)
	s = TCPSocket.new ip, 2000
	s.puts a
	while line = s.gets # Read lines from socket
	  puts line         # and print them
	end

	s.close   
end


def main
	opt  = ARGV[0].nil? ? "-q" : ARGV[0].to_s
	rcid = ARGV[1].nil? ? 0    : ARGV[1].to_i
	n    = ARGV[2].nil? ? 5    : ARGV[2].to_i
	time = ARGV[3].nil? ? 6    : ARGV[3].to_i


	logfile = File.new("/tmp/httpclient.log", "a")

	all_ip = IO.readlines("/tmp/ip.log")

	puts "There are #{all_ip.size} server."
	logfile.puts "There are #{all_ip.size} server."

	t1 = Time.new
	t = []
	all_ip.each{ |ip|
		t << Thread.new{
			func(ip.chomp, "#{opt} #{rcid} #{n} #{time}")
		}
	}

	t.each { |tt|
		tt.join
	}
	t2 = Time.new

	puts "use time: #{t2-t1}"
	logfile.puts "[StartTime]#{t1.strftime "%Y-%m-%d %H:%M:%S"}, [EndTime]#{t2.strftime "%Y-%m-%d %H:%M:%S"}, [UseTime]#{t2-t1}"
	logfile.close
end




main