require 'socket'

ip = `ifconfig eth0 |grep "inet addr" |awk '{print $2}'`.split(":")[1].chomp
host = `hostname`.chomp
user = `cat /etc/adesk/user.conf |grep name=`.chomp



logfile = File.new("/tmp/httpserver.log", "a")
ipfile = File.new("/tmp/ip.log", "a")

server = TCPServer.new ip, 2000

ipfile.puts ip
ipfile.close
puts "Server IP is #{ip}"
puts "Waiting..."

loop do
  Thread.start(server.accept) do |client|
  	time1 = Time.new
  	cmd = client.gets.chomp
  	time2 = Time.new
  	system("ruby /aclient.rb #{cmd}")
  	time3 = Time.new
    client.puts "[Server]#{ip}, [User]#{user}, end"
    client.close
    puts "[Server]#{ip}, [Host]#{host}, [User]#{user}, [CMD]#{cmd}"
    logfile.puts "[Server]#{ip}, [Host]#{host}, [User]#{user}, [CMD]#{cmd}, [ReciveTime]#{time1.strftime "%Y-%m-%d %H:%M:%S"}, [StartClientTime]#{time2.strftime "%Y-%m-%d %H:%M:%S"}, [EndClientTime]#{time3.strftime "%Y-%m-%d %H:%M:%S"}"
    logfile.close
  end
end