/* 
 * ui js for vdi 4.7; 
 * author: ch; 
 * updated at 2015-9-14
 */
;(function ($, window) {
 //获取eclog模块，统一打日志接口
    var eclog = require('eclog').console();
	
	//进度条html代码
	var progBar_RowFormat = [
		'<div class="progress-back" id="openrcprogBar_[GUID]">',
			'<div class="container">',
				'<div class="container-border">',
					'<div class="prog-bar-header">',
						'<h3>请稍候...</h3>',
						'<button type="button" class="close" id="closeProgBar" style="display:[HideNav]" data-bind="cancelSpicec"></button>',
					'</div>',
					'<div class="progress-tip">',
						'<span class="m-prog-text">正在获取配置...</span>',
						'<span class="m-prog-percent">0%</span>',
					'</div>',
					'<div class="progress">',
						'<span class="green" style="width: 0%;"></span>',
					'</div>',
				'</div>',
			'</div>',
		'</div>'
	].join('');
	
    
    var g = window.app = {
        //初始化界面，绑定界面相关动作；
        "firstGroupId": "0",
        "defaultResId": "0",
        "confXML": "",
        "rclistXML": "",
        "chgPwdEnable": '1',
        "isforcedChgPwd": false,
		"isHideNav": false,
        "curVMElement": null,
		"vmidToElem": {},
        "nwglobvalObj": null,
        "nwhttpsObj": null,
        "nwsystemObj": null,
		"nwsocketObj": null,
        "init": function () {
            if (g.nwsystemObj == null) {
                g.nwsystemObj = require("systemcall");
            }
            $("#rclist").on("mousedown", function (e) {
                e = e || window.event;
                var el = e.target || e.srcElement;
                var $el = ($(el).attr("class") === "show") ? $(el) : $(el).parents("dl");
                $el.addClass("click_down");
            }).on("mouseup", function () {
                $(".click_down").removeClass("click_down");
            });
            
            $(document).on("click", g.regClickFnforService);
            $(document).on("touchup", g.regClickFnforService);

            //初始化环境参数
            g.initEnvConfig();
			//刷新用户，获取confXML
            g.refreshUser();
        },

        "regClickFnforService": function(e){
             e = e || window.event;
            var el = e.target || e.srcElement;
            var $el = g.getEventEl(el);
            if (g.isBlank(el)) {
                $(".m-menu, .m-tips-box").hide();
            }

            if (!!$el.attr("data-toggle")) {
                g.toggleMenu($el);
            } else if (!!$el.attr("data-bind")) {
                g.handleAction($el);
            }           
        },

        //判断鼠标点击是否在空白的位置，用于隐藏浮动对象
        "isBlank": function (el) {
            return !($(el).parents("*[data-toggle]").length > 0 || $(el).attr("data-toggle") !== undefined);
        },
        //获取鼠标事件触发对象标签；
        "getEventEl": function (el) {
            return (!!$(el).attr("data-toggle") || !!$(el).attr("data-bind")) ? $(el) : $(el).parents("*[data-toggle],*[data-bind]").eq(0);
        },
        //截获鼠标所点击的对象动作
        "handleAction": function (el) {
            var evt = el.attr("data-bind");
            if (typeof g[evt] === "function") {
                g[evt](el);
            }
        },
        //切换资源组
        "switchGroup": function ($el) {
            var id = $el.attr("data-grpid");
            $(".groups li").removeClass("seled");
            g.refreshRC(id);
        },
		//获取资源长度，过滤掉非独享桌面资源
        "getRcsLength": function(xml) {
			var id = '0';
			var res_len = 0;
            $(xml).find("Resource>Rcs>Rc").each(function (index, element) {
				var $el = $(element);
				if ($el.attr('type') == '1' && $el.attr('svc') == 'VIRTUALDESK') {
					res_len++;
					id = $el.attr('id');
				}
			});
			if (res_len == 1) {
				g.defaultResId = id;
			}
			return res_len;
        },
		//获取资源组个数，需要过滤掉不存在独享桌面资源的资源组
		'getRcGroupLength': function(xml) {
			var rcGrpCount = 0;
			var resArr = $(xml).find('Resource>Rcs>Rc');
			$(xml).find("Resource>RcGroups>Group").each(function(index, element) {
				for (var i = 0; i < resArr.length; i++) {
					if ($(resArr[i]).attr('rc_grp_id') == $(element).attr('id') 
						&& $(resArr[i]).attr('type') == '1' 
						&& $(resArr[i]).attr('svc') == 'VIRTUALDESK') {
						rcGrpCount++;
						break;
					}
				}
			});
			return rcGrpCount;
		},
        //刷新资源组内容
        "refreshRC": function (grpid) {
            //grpid = grpid || "0";
            var twfId = "";
            if (g.nwglobvalObj.valin("TWFID")) {
                twfId = g.nwglobvalObj.getval("TWFID");
            }
            var cookie = "TWFID=" + twfId;
            var options = {
                    host: g.nwglobvalObj.getval("VDIADDR"),
                    port: g.nwglobvalObj.getval("port") || VDI_CLIENT_CONFIG.PORT,
                    path: VDI_CLIENT_CONFIG.PROXY,
                    method: 'POST',
                    rejectUnauthorized: false,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie
                    }
                };
            $req({
                url: VDI_CLIENT_CONFIG.PROXY,
                before: g.mask,
                success: function (xml) {
                    //对接收到的rclist进行渲染；
                    g.rclistXML = xml;
                    xml = "<xml>" + xml + "</xml>";
                    g.rcs_length = g.getRcsLength(xml);
                    g.group_length = g.getRcGroupLength(xml);
                    var grps = {"groups": parseRCGROUPS(xml)};
                    grpid = grpid || g.firstGroupId;
                    var list = {"list": parseRC(xml, grpid)};
                    //var grps = {"groups": parseRCGROUPS(xml)};
                    $("#rcgrps").html(template("rcgrps_tmp", grps));
                    $("#rclist").html(template("rclist_tmp", list));
                },
                after: function () {
                    var len = g.rcs_length;
                    var GroupLen = g.group_length;
                    if (len == 1 || (len <= 3 && GroupLen <= 1 && VDI_CLIENT_CONFIG.LESS_TO_CENTER)) {
                        g.center(); //设置居中为单列
                    } else {
                        g.grid(); //设置为九宫格
                        $("#rcgrps li[data-grpid=" + grpid + "]").addClass("seled");
                    }
                    g.unmask();
					//处理密码策略
					handlePwdStrategy();
                    //如果不存在不符合密码策略的情况，只配置了一个资源或者默认资源
					if (!g.isforcedChgPwd && g.defaultResId != "0" && g.rclistXML != "") {
						var rclistXML = '<xml>' + g.rclistXML + '</xml>';
						$(rclistXML).find('Resource>Rcs>Rc').each(function(index, el) {
							if ($(el).attr('id') == g.defaultResId) {
								g.openrc(el);
							}
						});
					}
                },
                fail: function(){
                    g.unmask();
                    $(document.body).tips({side:"top", msg: '网络可能不通，请检查网络', cls: 'error-tips', time: 5, x: 60, y: document.body.scrollWidth/2});                    
                }
            }, options, {});
        },
        //更新下用户名称
        "refreshUser": function () {
            var twfId = "";
            if (g.nwglobvalObj.valin("TWFID")) {
                twfId = g.nwglobvalObj.getval("TWFID");
            }
            var cookie = "TWFID=" + twfId;
            var options = {
                    host: g.nwglobvalObj.getval("VDIADDR"),
                    port: g.nwglobvalObj.getval("port") || VDI_CLIENT_CONFIG.PORT,
                    path: VDI_CLIENT_CONFIG.AUTH_SVR,
                    method: 'POST',
                    rejectUnauthorized: false,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie
                    }
                };
            $req({
                url: VDI_CLIENT_CONFIG.AUTH_SVR,
                before: g.mask,
                success: function (xml) {
                    g.confXML = xml;   //打开资源时将conf.xml写入文件供spicec读取
                    xml = "<xml>" + xml + "</xml>";
                    var username = parseConf(xml);
					if (getZhLength(username) > 8) {
						username = cutZhString(username, 8);
					}
					//首次刷新资源，获取rclistXML
					//自动打开资源时，需要判断confXML里HideNav的值，所以只能将刷新资源refreshRC放到成功回调函数里执行
					g.refreshRC(0);
					//写入用户名
                    $("#username").html(username);
                },
                after: function () {
                    g.unmask();
                },
                fail: function(){
                    g.unmask();
                    $(document.body).tips({side:"top", msg: '网络可能不通，请检查网络', cls: 'error-tips', time: 5, x: 60, y: document.body.scrollWidth/2});
                }
            }, options, {});
        },
        //操作遮罩
        "mask": function () {
            $("#mask").show();
        },
        //隐藏遮罩
        "unmask": function () {
            $("#mask").hide();
        },
        //如果资源内容小于3个，将其折叠居中
        "center": function () {
            $("#mainContainer").removeClass("grid").addClass("center");
            var el = $("#mainContainer .inner"), h = el.height();
			var availH = window.screen.availHeight;
			var availW = window.screen.availWidth;
			if (availH <= 600 || (availW > 800 && availW < 1024)) {
				el.css({"top": (-h / 2 - 100) + "px"});
			} else {
				el.css({"top": (-h / 2) + "px"});
			}
            g.animate();
        },
        //如果资源内容大于3个则变换为九宫格模式
        "grid": function (grpid) {
            $("#mainContainer").removeClass("center").addClass("grid");
            if (!VDI_CLIENT_CONFIG.ANIMATE) {
                return;
            }
            var rcs = $("#rclist dl"), l = rcs.length, index = 0, i = 0;
            do {
             //   $('<dl class="empty"><dt><img src="../imgs/s.png"></dt><dd>&nbsp;</dd></dl>').appendTo("#rclist");
                i++;
            } while (i + l < VDI_CLIENT_CONFIG.PAGE_SIZE);
            g.animate();
        },
        //刷新资源时的动画；基于CSS3
        "animate": function () {
            var rcs = $("#rclist dl"), l = rcs.length, index = 0, i = 0;
            g.timer = window.setInterval(function () {
                $("#rclist dl").eq(index).addClass("flipIn");
                if (index >= VDI_CLIENT_CONFIG.PAGE_SIZE) {
                    window.clearInterval(g.timer);
                    setTimeout(function () {
                        $("#rclist dl").removeClass("flipIn").addClass("show");
                    }, 500);
                }
                index++;
            }, 50);
        },
        //切换菜单及浮动信息框
        "toggleMenu": function (el) {
            var target = el.attr("data-toggle") || "";
            $(".m-menu,.m-tips-box").each(function (index, itm) {
                var id = "#" + $(itm).attr("id");
                if (id !== target) {
                    $(itm).hide();
                }
            });
            $(target).toggle();
			if (target == "#top-setting-menu") {
				$('.m-menu-border').toggle();
			}
        },
		"person": function () {
            //修改密码弹出框
            $("#modpassModal").show();
            $("#orgPassword")[0].focus();
        },
        "eclogoutclose":function(el){
            $("#eclogout").hide();
        },
        "eclogoutconfirm":function(el){
            $("#eclogout").hide();
            g.exelogout();
        },
        "eclogoutcancel":function(el){
            $("#eclogout").hide();
        },
        "logout": function(){
            $("#eclogout").show();
        },
        "exelogout": function(){
            //todo: 注销操作
            g.initEnvConfig();
            g.confXML = '';
            g.rclistXML = '';
            g.isforcedChgPwd = false;
            g.defaultResId = "0";
			g.firstGroupId = "0";
			g.isHideNav = false;
			

            $(document).unbind('click', g.regClickFnforService);
            $(document).unbind('touchup', g.regClickFnforService);
            //注销命令
            var headers = authlogin.unpackAllCookie();

            var host = g.nwglobvalObj.getval('VDIADDR');
            var port = g.nwglobvalObj.getval('port');
            var path = "/por/logout.csp?r=0.123456";

            var options = {
                host: host,
                port: port,
                path: path,
                method: 'GET',
                headers: headers,
                rejectUnauthorized: false
            };
            g.nwhttpsObj.httpsRequset(options,null,null,null);
            
            //清理密码策略
            authlogin.globalval.setval("pwp_errorcode", "-1");
            g.nwsystemObj.unsetSessionconf(function(res,data){
                //注销清空session.conf
                //通知tcagent注销
                authlogin.setLoginStatus(false);
                authlogin.logoutsucc(g.nwglobvalObj.getval("TWFID"));
                authlogin.globalval.setval("ENABLE_RANDCODE","O");

                $("#content").load("login.html",function(){
                    authlogin.init(true);        
                });
            },function(res,err){
                authlogin.setLoginStatus(false);
                authlogin.logoutsucc(g.nwglobvalObj.getval("TWFID"));
                authlogin.globalval.setval("ENABLE_RANDCODE","O");

                $("#content").load("login.html",function(){
                    authlogin.init(true);        
                });                
                eclog.warn("clear session.conf failed, %j", err);
            });
        },
        "openrc": function (el) {
            //wbm add log
            g.nwsystemObj.exec("echo `hostname`:`date +%H-%M-%S` >> /tmp/openrc.log", function(){}, function(){});
            var svc = $(el).attr("svc");
            var id = $(el).attr("id");
            g.curVMElement = el;   //保存当前虚拟机对应的元素，在后面重置虚拟机有用到
            if (g.nwsystemObj && svc == "VIRTUALDESK") {
				//这里需要动态创建进度条，不然点击取消时，再执行回调函数时会出现进度条错误
				var rowFormat = progBar_RowFormat;
				var GUID = guid();
				rowFormat = rowFormat.replace(/\[GUID\]/g, GUID);
				//如果控制台下发HideNav则隐藏进度条'取消'按钮
				if (g.isHideNav) {
					rowFormat = rowFormat.replace(/\[HideNav\]/g, 'none');
				} else {
					rowFormat = rowFormat.replace(/\[HideNav\]/g, 'block');
				}
				$(document.body).append(rowFormat);
			   
				handleProgressBar(GUID, 'GETVMCONF');    //正在获取配置...
				
				var queryVDCount = 0;
				//打开spicec成功回调函数
				var qvdsuccessfn = function(result) {
					if ($('#openrcprogBar_' + GUID).length == 0) {
						return ;
					}
					var vmconfObj = $.parseJSON(result);
					vmconfObj.title = $(el).attr('name');   //将虚拟机名称传递给spicec
                    eclog.log('query vm config state successed : %j', vmconfObj);
                    g.nwsystemObj.exec("echo `hostname`:`date +%H-%M-%S` >> /tmp/qvdsuccessfn.log", function(){}, function(){});
                    //eclog.log('[WBM]query vm config end time:%j', new Date);
                    //g.nwsystemObj.exec("echo `hostname`:`date +%H-%M-%S` >> /tmp/end_time.log", null, null);
					
					if (vmconfObj.res_error == ADESK_QUERY_ERRCODE.VDI_QRY_ALLOC_FAILURE) {
						if ($('#openrcprogBar_' + GUID).length > 0) {
							hideProgressBar(GUID);
						}
						$(document.body).tips({side:"top", msg: '没有可分配的虚拟机，请联系管理员!', cls: 'error-tips', time: 5, x: 60, y: document.body.scrollWidth/2});
                        g.nwsystemObj.exec("echo `hostname`:`date +%H-%M-%S` >> /tmp/res_error.log", function(){}, function(){});
						return ;
					}
					//如果状态没有准备好，就继续查询
					if (vmconfObj.res_state != ADESK_QUERY_STATUS.VDI_QUERY_STATE_OK) {
                        eclog.log('vm state is not ok, try requery times: %j', queryVDCount);
                        
						//如果查询超过等于5次，则停止查询，提示获取配置失败
						if (++queryVDCount >= 5) {
                            eclog.warn('try requery 5 times, get vm config failed');
							if ($('#openrcprogBar_' + GUID).length > 0) {
								hideProgressBar(GUID);
							}
                            g.nwsystemObj.exec("echo `hostname`: connect failed! >> /tmp/failed.log", function(){}, function(){});
							$(document.body).tips({side:"top", msg: '获取配置失败，请联系管理员!', cls: 'error-tips', time: 5, x: 60, y: document.body.scrollWidth/2});
                            
							return ;
						}
						//查询失败后，隔5秒后继续查询，直到查询成功或者超过5次
						setTimeout(function() {
                            g.nwsystemObj.exec("echo `hostname`:`date +%H-%M-%S` >> /tmp/queryVDesktop.log", function(){}, function(){});
							g.nwsystemObj.queryVDesktop({resid: id}, qvdsuccessfn, qvdfailedfn);
						}, 5000); 
						return ;
					} else {
						//todo: 将vmid和元素对应起来
						g.vmidToElem = {};
						g.vmidToElem[vmconfObj.vmid] = el;
					}
					
					handleProgressBar(GUID, 'WRITEVMCONF');
					//将confXML内容写进配置文件，供spicec获取里面USB黑白名单
					if (!g.nwsystemObj.writeConfXMLSync(g.confXML)) {
						eclog.warn('write usb black and white list failed');
						if ($('#openrcprogBar_' + GUID).length > 0) {
							hideProgressBar(GUID);
						}
						return ;
					}
					
					if (g.nwglobvalObj.getval('isinsertMonitor')) {
						$('#openrcprogBar_' + GUID + ' .progress-tip .m-prog-text').text(APPTRACER.SETRESOLUTE);
					} else {
						$('#openrcprogBar_' + GUID + ' .progress-tip .m-prog-text').text(APPTRACER.CONNECTINGVM);
					}
					//设置进度条的进度提示
					var randW = parseInt(Math.random()*100)%91+450; //450px-540px
					var t = setInterval(function() {
						if ($('#openrcprogBar_' + GUID).length == 0) {
							clearInterval(t);
							return ;
						}
						var w = $('#openrcprogBar_' + GUID + ' .progress .green').css('width');
						w = parseInt(w.replace(/px/g, ''));
						w += 50;
						if (w > randW) {
							w = randW;
							clearInterval(t);
						}
						$('#openrcprogBar_' + GUID + ' .progress .green').css('width', w+'px');
						$('#openrcprogBar_' + GUID + ' .progress-tip .m-prog-percent').text(parseInt(w*100/560).toString() + '%');
					}, 50);
					
					if ($('#openrcprogBar_' + GUID).length == 0) {
						return ;
					}

                    //wbm add log
                    g.nwsystemObj.exec("echo `hostname`:`date +%H-%M-%S` >> /tmp/spice.log",  function(){}, function(){});
					//打开独享桌面，保存spicec进程pid，用于后续点击取消时kill掉spicec
					var spicecpid = g.nwsystemObj.openVDesktop(vmconfObj, function(result) {
						//todo: 打开spiece进程成功，此时会通知nodejs，收到通知后去掉进度条提示
						eclog.log('adesk-spicec exit normal');
						g.nwglobvalObj.setval('spicecpid', "-1");
						g.nwglobvalObj.setval('isonVdesktop', false); //将是否在spicec中置为false
						killAllAdeskbar();
					}, function(error) {
                        eclog.warn('adesk-spicec exit with error, %j', error);
						if ($('#openrcprogBar_' + GUID).length > 0) {
							hideProgressBar(GUID);
						}
						//处理各种退出码
						g.dealSpicecErr(error);
						g.nwglobvalObj.setval('spicecpid', "-1");
						g.nwglobvalObj.setval('isonVdesktop', false);
						killAllAdeskbar();
					});

					//设置spicecpid，用于后面需要杀死spicec进程树用
					g.nwglobvalObj.setval('spicecpid', spicecpid);
				};
				
				//打开spicec失败回调函数
				var qvdfailedfn = function(error) {
					eclog.warn('query vm state failed, %j', error);
					if ($('#openrcprogBar_' + GUID).length > 0) {
						hideProgressBar(GUID);
					}
                    g.nwsystemObj.exec("echo `hostname`:`date +%H-%M-%S` >> /tmp/qvdfailedfn.log", function(){}, function(){});
					$(document.body).tips({side:"top", msg: '获取虚拟桌面配置失败!', cls: 'error-tips', time: 5, x: 60, y: document.body.scrollWidth/2});
				};
				
				//todo: 查询虚拟机配置,参数：资源id、成功回调、失败回调
                g.nwsystemObj.exec("echo `hostname`:`date +%H-%M-%S` >> /tmp/queryVDesktop.log", function(){}, function(){});
				g.nwsystemObj.queryVDesktop({resid: id}, qvdsuccessfn, qvdfailedfn);

            } else {
				//todo: 打开资源失败，提示模块未加载
				eclog.error('systemcall module not loaded');
			}
        },
        "restartVM": function(data) {
            //todo: 重启虚拟机
            if (g.nwsystemObj) {
				//$('#restartVMprogBar .container-border .m-prog-text').text('正在发送虚拟机重启命令...');
				//$('#restartVMprogBar').show();
                g.nwsystemObj.resetVDesktop({resid: $(g.curVMElement).attr('id')}, function(ret) {
                    //todo: 重置虚拟机返回，需要再次请求该虚拟机
                    ret = $.parseJSON(ret);
                    if (ret.result == '1') {
						/*setTimeout(function() {
							$('#restartVMprogBar .container-border .m-prog-text').text('虚拟机重启命令发送成功');
							//todo: 获取重启的虚拟机的资源元素
							setTimeout(function() {
								$('#restartVMprogBar').hide();
								g.openrc(g.curVMElement);
							}, 3000);
						}, 4000);*/
                    } else {
						//$('#restartVMprogBar').hide();
                        eclog.warn('reset vm return ret result is not success: %j', ret.result);
						$(document.body).tips({side:"top", msg: '重启虚拟机失败!', cls: 'error-tips', time: 5, x: 60, y: document.body.scrollWidth/2});
					}
                }, function(error) {
                    eclog.warn('reset vm failed, %j', error);
					//$('#restartVMprogBar').hide();
					$(document.body).tips({side:"top", msg: '重启虚拟机失败!', cls: 'error-tips', time: 5, x: 60, y: document.body.scrollWidth/2});
                });
            }
        },
		"shutdownVDesktopAll": function() {
			//todo: 关闭所有的虚拟机
			if (g.nwsocketObj) {
				for (var vmid in g.vmidToElem) {
					g.nwsocketObj.shutdownVDesktop(vmid);
				}
			}
		},
		"rebootVDesktopAll": function() {
			//todo: 重启所有的虚拟机
			if (g.nwsystemObj && g.nwsocketObj) {
				for (var vmid in g.vmidToElem) {
					var id = $(g.vmidToElem[vmid]).attr('id');
					g.nwsystemObj.resetVDesktop({resid: id}, function(ret) {}, function(error) {});
					g.nwsocketObj.popupRebootWindow(vmid);
				}
			}
		},
		"insertMonitor": function() {
			//todo: 在spicec中收到insert_monitor消息
			if (g.nwsystemObj && g.nwglobvalObj.getval('spicecpid') != "-1") {
				g.mask();
				g.nwsystemObj.killPsTree(g.nwglobvalObj.getval('spicecpid'), function() {
					g.nwsystemObj.setResolut({cancelconfig: true}, function() {
						g.unmask();
						g.openrc(g.curVMElement);
					}, function(error) {
						g.unmask();
						eclog.log('insertMonitor method failed');
					});
				});
				g.nwglobvalObj.setval('spicecpid', "-1");
			}
		},
        "error": function (msg) {
            console.info(msg);
        },
        "initEnvConfig": function() {
            //todo: 初始化环境参数，加载模块、VDI中心管理器地址等
            if (g.nwglobvalObj == null) {
				//todo: 全局变量模块
                g.nwglobvalObj = require("globalval");
            } 
            if (g.nwhttpsObj == null) {
				//todo: 发送https请求模块
                g.nwhttpsObj = require("nodehttps");
            }
            if (g.nwsystemObj == null) {
				//todo: 系统调用模块
                g.nwsystemObj = require("systemcall");
            }
			if (g.nwsocketObj == null) {
				g.nwsocketObj = require("socketaction");
			}
        },
        'confirmModPass': function() {
            var pripsw = $('#orgPassword').val();
            var newpsw = $('#newPassword').val();
            var conpsw = $('#confirmPassword').val();
            if (newpsw != conpsw) {
                setpswfocus();
                $('#confirmPassword').tips({side: "bottom", msg: '两次密码输入不一致，请重新输入', cls: 'error-tips', time: 5, x: 3, y: 0});
                return ;
            }

            $('#modpassmask .tips_loading').text("请稍候...");
            $('#modpassmask').show();

            var twfId = "";
            if (g.nwglobvalObj.valin("TWFID")) {
                twfId = g.nwglobvalObj.getval("TWFID");
            }
            var cookie = "TWFID=" + twfId;
            var options = {
                    host: g.nwglobvalObj.getval("VDIADDR"),
                    port: g.nwglobvalObj.getval("port") || VDI_CLIENT_CONFIG.PORT,
                    path: VDI_CLIENT_CONFIG.CHANGEPWD,
                    method: 'POST',
                    rejectUnauthorized: false,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie,
                        'Referer': 'https://' + g.nwglobvalObj.getval("VDIADDR") + VDI_CLIENT_CONFIG.CHANGEPWD_REFERER
                    }
                };
            var contents = {
                pripsw: pripsw,
                newpsw: newpsw,
                cknote: 0
            };
            $req({
                url: VDI_CLIENT_CONFIG.CHANGEPWD,
                success: function (eCode) {
                    changepswResult($.trim(eCode));
                },
                fail: function(){
                    setpswfocus();
                    $('#confirmPassword').tips({side: "bottom", msg: '网络可能不通，请检查网络', cls: 'error-tips', time: 5, x: 3, y: 0});
                    $('#modpassmask').hide();
                }
            }, options, contents);
        },
        'unconfirmModPass': function() {

			$('.error-tips').remove();
            var  pwp_errorcode = g.nwglobvalObj.getval("pwp_errorcode");
            if(pwp_errorcode == "-1"){
                $("#modpassModal").hide();
            }else{
                g.exelogout();
            }
            
        },
        'passModalClose': function() {

			$('.error-tips').remove();
            var  pwp_errorcode = g.nwglobvalObj.getval("pwp_errorcode");
            if(pwp_errorcode == "-1"){
                $("#modpassModal").hide();
            }else{
                g.exelogout();
            }
        },
		'hideprogBar': function() {
			hideProgressBar();
		},
		'cancelSpicec': function() {
			//todo: 如果打开虚拟桌面时取消，则设置标记
			hideProgressBar();
			if (g.nwglobvalObj.getval('spicecpid') != "-1" && g.nwsystemObj) {
				g.nwsystemObj.killPsTree(g.nwglobvalObj.getval('spicecpid'));
				g.nwglobvalObj.setval('spicecpid', "-1");
			}
		},
        'dealSpicecErr': function(error){
            /*如果是控制台注销的情况*/
            if(g.nwglobvalObj.getval('forcelogout') == "1"){
                return;
            }
            /*点击进度条取消 或 主动关闭spicec*/
            if(error.code == null){
                return;
            }

            if(error.code == 1){
                 $(document.body).tips({side:"top", msg: '打开虚拟桌面失败!', cls: 'error-tips', time: 5, x: 60, y: document.body.scrollWidth/2});
            }          
        },
		'dealPCClient': function(data, socket) {
			//todo: 处理PC一体化的情况，自己构造错误json格式
			eclog.log('dealPCClient:' + JSON.stringify(data));
			var errRes = {'id': data.id, 'error': {}};
            var timeoutvalue = data.timeout;
			if (typeof data.params.vmid != 'undefined' && typeof g.vmidToElem[data.params.vmid] != 'undefined') {
				var el = g.vmidToElem[data.params.vmid];
				var id = $(el).attr('id');
				if (g.nwsystemObj) {
					g.nwsystemObj.queryVDesktop({resid: id, timeout: timeoutvalue}, function(result) {
						//将查询的结果发送给spicec
						var senddata = {};
						senddata.result = $.parseJSON(result);
						senddata.id = data.id;
						sendResultToSpicec(JSON.stringify(senddata), socket);
					}, function(error) {
						if (error.code == 200) {
							errRes.error.code = -1000;
							errRes.error.message = 'Time Out';
						} else {
							errRes.error.code = -1001;
							errRes.error.message = 'Other Error';
						}
						sendResultToSpicec(JSON.stringify(errRes), socket);
					});
				}
			} else {
				errRes.error.code = -1002;
				errRes.error.message = 'Invalid VM ID';
				sendResultToSpicec(JSON.stringify(errRes), socket);
			}
		}
    };
	
	/* 发送结果到spicec，有两种
	 * 1、从adesk-client获取的正确结果
	 * 2、adesk-client结果出错，发送错误码
	 */
	function sendResultToSpicec(data, socket) {
		//todo: 发送结果到spicec
		eclog.log('sendResultToSpicec:' + data);
		if (socket != null) {
			socket.write(data);
		}
	}
	 
	
	//setInterQuery 循环计时器 
	/*
	 * fn: 表示需要回调的函数
	 * ftime: 表示第一次需要延迟多长时间执行
	 * ltime：表示以后每隔多长时间执行
	 */
	function setInterQuery(fn, ftime, ltime) {
		var timeCfg = {cancel:false};
		var fn1 = function() {
			fn(timeCfg);
			if (!timeCfg.cancel) {
				setTimeout(fn1, ltime);
			}
		}
		window.setTimeout(fn1, ftime);
	}
    
    //处理进度条状态，显示百分比和文本提示
    function handleProgressBar(GUID, progString) {
        var index = 1;
		var progID = '#openrcprogBar_' + GUID;
        var w = $(progID + ' .progress').css('width').replace(/px/g, '');
		var randW = 0;
        switch(progString) {
            case "GETVMCONF":
                index = 1;
				randW = parseInt(Math.random()*100)%21+25; //25%-45%
                break;
            case "WRITEVMCONF":
                index = 2;
				randW = parseInt(Math.random()*100)%21+46; //46%-66%
                break;
            case "CONNECTINGVM":
                index = 3;
                break;
            case "CONNECTSUCCESS": 
                index = 4; 
                break;
            default: break;
        }
       
        if (index == 4) {
            $(progID + ' .progress .green').css('width', w.toString() + 'px');
            $(progID + ' .progress-tip .m-prog-percent').text('100%');
        } else {
			if (g.nwglobvalObj.getval('isinsertMonitor')) {
				$(progID + ' .progress-tip .m-prog-text').text(APPTRACER['SETRESOLUTE']);
			} else {
				$(progID + ' .progress-tip .m-prog-text').text(APPTRACER[progString]);
			}
            $(progID + ' .progress .green').css('width', parseInt(randW*w/100).toString() + 'px');
            $(progID + ' .progress-tip .m-prog-percent').text(parseInt(randW).toString() + '%');
        }
    }
    
    //显示进度条
    function showProgressBar() {
	//	$('#openrcprogBar').appendTo(document.body);
      //  $('#openrcprogBar').css({"display": "block"});
    }
    
    //隐藏进度条，移除id以openrcprogBar_为前缀的元素
    function hideProgressBar(GUID) {
		if (typeof GUID != 'undefined') {
			$('#openrcprogBar_' + GUID).css({"display": "none"});
			$('#openrcprogBar_' + GUID).remove();
		} else {
			$('div[id^=openrcprogBar_]').css({"display": "none"});
			$('div[id^=openrcprogBar_]').remove();
		}
    }
    //修改密码提示框，错误数据清理，设置光标
    function setpswfocus(){
        $('#orgPassword').val('');
        $('#newPassword').val('');
        $('#confirmPassword').val('');        
        var $el = $('#orgPassword');
        if (g.isforcedChgPwd) {
            $el = $('#newPassword');
        }
        $el[0].focus();
    }
    //解析修改密码结果
    function changepswResult(eCode) {
        if (eCode == null || eCode == "" || eCode.match(/^[0-9]|[1-9][0-9]$/) == null) {
            setpswfocus();
            $(document.body).tips({side:"top", msg: '修改密码失败,可能是网络连接错误', cls: 'error-tips', time: 5, x: 60, y: document.body.scrollWidth/2});
            $('#modpassmask').hide();
            return;
        }
        
        if (eCode == "0") {    

            $(document.body).tips({side:"top", msg: '密码修改成功!', cls: 'error-tips', time: 5, x: 60, y: document.body.scrollWidth/2});
            if (g.isforcedChgPwd) {
                g.isforcedChgPwd = false;
                g.nwglobvalObj.setval("pwp_errorcode", -1);   //修改成功后设置pwp_errorcode为-1
                var $pwd_arr = $('#modpassModal .bs-example div');
                $pwd_arr.eq(0).show();
                $pwd_arr.eq(1).css({"paddingTop": "5px"});
            }

            $('#modpassmask').hide();            
            $("#modpassModal").hide();
        } else {
            if (eCode < 20) {
                $tipsEl = $('#confirmPassword');
                $tipsEl.tips({side: "bottom", msg: errCode.chgpsw[eCode], cls: 'error-tips', time: 5, x: 3, y: 0});
                
                if(eCode == "4" && !g.isforcedChgPwd){
                    $('#orgPassword').focus();
                } else {
                    $('#newPassword').focus();
                }
                $('#orgPassword').val('');
                $('#newPassword').val('');
                $('#confirmPassword').val('');
            } else {
                setpswfocus();
                var alertMsg = getPwdStrategyResult(eCode);
                $('#newPassword').tips({side: "bottom", msg: alertMsg, cls: 'error-tips', time: 5, x: 3, y: 0});
            }
            $('#modpassmask').hide();
        }
    }
    
    //初始化时用来处理密码策略，如不符合策略则弹出修改密码框
    function handlePwdStrategy() {
        if (g.nwglobvalObj.valin("pwp_errorcode")) {
            //todo: eCode默认值为-1，若大于0，则表示不符合密码策略
            eCode = g.nwglobvalObj.getval("pwp_errorcode");
            if (eCode >= 0) {
                //todo: 区分是否是初始化处理密码策略问题(为0)，还是个人设置处理密码策略问题(为1)
                g.isforcedChgPwd = true;
                var alertMsg = getPwdStrategyResult(eCode);   //获取密码策略结果
                var $pwd_arr = $('#modpassModal .bs-example div');
                $pwd_arr.eq(0).hide();
                $pwd_arr.eq(1).css({"paddingTop": "20px"});
                $('#modpassModal').show();
                $("#newPassword")[0].focus();
                $('#newPassword').tips({side: "bottom", msg: alertMsg, cls: 'error-tips', time: 5, x: 3, y: 0});
            }
        }
    }
    
    function getPwdStrategyResult(eCode) {
        eCode -= 20;
        var index = 0;
        var alertMsg = "对不起,按照当前的密码策略,您的密码不符合以下密码策略:";
        if (eCode & 1) {
            var minLength = 0;
            var g_pwd_minlen = $('<xml>'+g.confXML+'</xml>').find('Conf>Other').eq(0).attr('psw_minlen');
            if (g_pwd_minlen != "") {
                minLength = g_pwd_minlen;
            }    
            alertMsg += (++index + ": 密码长度不小于" + minLength.toString() + "位.");
        }
        if (eCode & 8)alertMsg += (++index + ": 密码不能包含用户名.");
        if (eCode & 64)alertMsg += (++index + ": 密码必须包含数字.");
        if (eCode & 128)alertMsg += (++index + ": 密码必须包含字母.");
        if (eCode & 256)alertMsg += (++index + ": 密码必须包含特殊字符.");
        if (eCode & 512)alertMsg += (++index + ": 新密码不能与旧密码完全相同.");
        return alertMsg;
    }
	
	//获取列表中的非独享桌面资源个数
	function GetOtherRcCout(xml) {
		var otherRc = 0;
		$(xml).find("Resource>Rcs>Rc").each(function (index, element) {
			var $el = $(element);
            //排除非独享桌资源
			if ($el.attr("type") == '1' && $el.attr("svc") != 'VIRTUALDESK') {
				otherRc++;
			}
		});
		return otherRc;
	}
    
    //获取rclist资源中，l3vpn资源的个数(dns资源)
    function GetIpRcCout(xml) {
        var l3vpncout = 0;
        var otherRes = 0;
        var id = "0";
        $(xml).find("Resource>Rcs>Rc").each(function (index, element) {
            var $el = $(element);
            //排除下DNS下发的
            if($el.attr("type") == "2"){
                l3vpncout++;
            }
            else{
                otherRes++;
                id = $el.attr("id");
            }
        });
        
        //如果只有一个资源就赋值
        if (otherRes == 1){
            g.defaultResId = id;
        }
        
        return l3vpncout;
    }

    //解析资源格式为json以便于输出；(调用parseRC之前必须先调用GetIpRcCout，否则默认资源处理会有点问题)
    function parseRC(xml, grpid) {
        var rc = [];
        $(xml).find("Resource>Rcs>Rc").each(function (index, element) {
            var $el = $(element);
            //排除下DNS下发的
            if(($el.attr("rc_grp_id") == grpid) && $el.attr("type") != "2" && $el.attr("svc") == "VIRTUALDESK"){
                rc.push({
                    id: $el.attr("id") || "",
                    name: $el.attr("name") || "",
                    svc: $el.attr("svc") || "",
                    app_path: $el.attr("app_path") || "",
                    img: $el.attr("rc_logo") || "shareDesk.png",
                    description: $el.attr("description") || "",
                    group: $el.attr("rc_grp_id") || 0
                });
            }
        });
        
        //如果不是单个资源的情况，就去查找默认资源
        if (g.defaultResId == "0"){
            $(xml).find("Resource>Other").each(function (index, element) {
                var $el = $(element);
                g.defaultResId = $el.attr("defaultRcId") || "0";
            });
        }
        
        return rc;
    }
    //解析conf.xml读取用户名并设置session配置数据
    function parseConf(xml) {
        var username;
        var sslctx;
        var twfid = '';
        $(xml).find("Conf>Other").each(function (index, element) {
            var $el = $(element);
            username = $el.attr("login_name") || "Admin";
            sslctx = $el.attr("sslctx") || "";
            //判断是否允许用户修改密码，若不允许，则隐藏掉修改密码选项
            g.chgPwdEnable = $el.attr('chg_pwd_enable') || '1';
            if (g.chgPwdEnable == '1') {
                $('#top-setting-menu div').first().show();
				$('.m-menu-border').css({"height": "71px"});
            } else {
                $('#top-setting-menu div').first().hide();
				$('.m-menu-border').css({"height": "41px"});
            }
        });
		//获取是否隐藏导航栏
		$(xml).find("Conf>SpiceConf").each(function(index, element) {
			var $el = $(element);
			g.isHideNav = $el.attr("HideNav") == '1' ? true : false;
		});
		
        if (g.nwglobvalObj.valin("TWFID")) {
            twfid = g.nwglobvalObj.getval("TWFID");
        }
        var session = {'twfid': twfid, 'sslctx': sslctx, 'username': username};
        if (g.nwsystemObj) {
            g.nwsystemObj.setSessionconf(session, function() {
                authlogin.loginsucc(twfid);
            }, function(error) {});
        }

        return username;
    }
	
	//解析资源组为json以便于输出；
	function parseRCGROUPS(xml) {
		var grps = [];
		var resArr = $(xml).find('Resource>Rcs>Rc');
		$(xml).find("Resource>RcGroups>Group").each(function (index, element) {
            var $el = $(element);
            if (parseInt($el.attr("id"), 10) >= 0) {
				var matchGrp = false;
				for (var i = 0; i < resArr.length; i++) {
					if ($(resArr[i]).attr('rc_grp_id') == $el.attr('id')
						&& $(resArr[i]).attr('type') == '1'
						&& $(resArr[i]).attr('svc') == 'VIRTUALDESK') {
						//此时的资源组才符合条件，才应该显示到资源界面上
						matchGrp = true;
					}
				}
				if (matchGrp) {
					if (g.firstGroupId == "0") {
						g.firstGroupId = $el.attr("id");
					}
					grps.push({
						"id": $el.attr("id") || "",
						"name": $el.attr("name") || ""
					});
				}
            }
        });
        return grps;
	}
	
	
    
    //封装https请求；
    function $req(o, options, contents) {
        o = $.extend({
            url: "",
            before: function () {
            },
            success: function () {
            },
            after: function () {
            },
            fail: function(){

            }
        }, o);
        if (typeof o.before == "function") {
            o.before();
        }
        g.nwhttpsObj.httpsRequset(options, contents, function(res, data) {
            //todo: 这里不需要将data封装成xml对象，有的数据不是xml格式
            o.success(data);
            window.setTimeout(function() {
                if (typeof o.after == "function") {
                    o.after();
                }
            }, 200);
        }, function(res, err) {
            g.error('https response failed!');
            o.fail();
        });
    }
	
	//不管spicec退出时走成功回调还是失败回调，都调用该函数清除所有的adesk_bar进程
	function killAllAdeskbar() {
		if (g.nwsystemObj) {
			g.nwsystemObj.clearAdeskbarprog(function() {}, function(error) {});
		}
	}
    
    
})(jQuery, window);



 var Base64 = {
 
    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
    // public method for encoding
    encode : function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
 
        input = Base64._utf8_encode(input);
 
        while (i < input.length) {
 
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
 
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
 
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
 
            output = output +
            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
        }
        return output;
    },
 
    // public method for decoding
    decode : function (input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
 
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
        while (i < input.length) {
 
            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));
 
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
 
            output = output + String.fromCharCode(chr1);
 
            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
 
        }
 
        output = Base64._utf8_decode(output);
 
        return output;
 
    },
 
    // private method for UTF-8 encoding
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";
 
        for (var n = 0; n < string.length; n++) {
 
            var c = string.charCodeAt(n);
 
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    },
 
    // private method for UTF-8 decoding
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
 
        while ( i < utftext.length ) {
 
            c = utftext.charCodeAt(i);
 
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
 
        }
 
        return string;
    }
 
}
function base64encode(input){
    return Base64.encode(input);
} 
function base64decode(input){
    return Base64.decode(input);
}


//日期格式化函数；
Date.prototype.format = function (format) //author: meizz
{
    $this = this;
    var o = {
        "M+": $this.getMonth() + 1, //month
        "D+": $this.getDay(),
        "d+": $this.getDate(), //day
        "h+": $this.getHours(), //hour
        "m+": $this.getMinutes(), //minute
        "s+": $this.getSeconds(), //second
        "q+": Math.floor(($this.getMonth() + 3) / 3), //quarter
        "S": $this.getMilliseconds() //millisecond
    };
    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1,
                ($this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
};

String.format = function() {
    if( arguments.length == 0 )
        return null; 
    var str = arguments[0]; 
    for(var i=1;i<arguments.length;i++) {
        var re = new RegExp('\\{' + (i-1) + '\\}','gm');
        str = str.replace(re, arguments[i]);
    }
    return str;
};

//生成GUID
function guid() {
    function S4() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

//获取用户名的长度，一个中文两个字节，英文一个字节
function getZhLength(str) {
	var realLength = 0;
	var len = str.length;
	var charCode = 1;
	for (var i = 0; i < len; i++) {
		charCode = str.charCodeAt(i);
		if (charCode >= 0 && charCode <= 128) {
			realLength += 1;
		} else {
			realLength += 2;
		}
	}
	return realLength;
}

//截取字符串长度，中文占2个字节，英文占一个字节
function cutZhString(str, len) {
	var strLength = 0;
	var strCut = '';
	var realLength = str.length;
	for (var i = 0; i < realLength; i++) {
		var a = str.charAt(i);
		strLength++;
		if (escape(a).length > 4) {
			strLength++;
		}
		strCut = strCut.concat(a);
		if (strLength >= len) {
			strCut = strCut.concat('...');
			return strCut;
		}
	}
	if (strLength < len) {
		return str;
	}
}











