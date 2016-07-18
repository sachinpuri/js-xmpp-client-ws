var CHAT_WITH_JID=null;
var chat=angular.module('chat',[]);
var messages={};
var tmpArchivedMessages=[];
var isArchiveComplete={};
var scrollLocked = false;

document.title = "XMPP Client: " + getParameterByName('jid');
/**
* Angular Code
**/

chat.controller('Chat',function($scope){
    $scope.buddies=[];
    $scope.chats=[];    
    $scope.name="Chat";
    $scope.rooms=[];
    $scope.chatType='chat';
    $scope.status="";
    $scope.notifictions = [];
    
    $scope.connect = function(jid, pass, res){
        xmppClient.connect({
            username:jid, 
            password:pass,
            resource:res,
            host:'ejabberdnode1',
            http_ws_url:'ws://192.168.0.70:5280/websocket',
            debug:1,
            onFailure:function(msg){
                if(msg==="not-authorized"){
                    $("#loginWrapper").show();
                    $("#bgDisabled").show();
                    $("#loginError").html("Invalid username/ password");
                }
            },
            onSuccess:function(){
                console.log("Connected to server");
                xmppClient.MUC.getRooms();                
                $("loginWrapper").hide();
                $("#bgDisabled").hide();
            },
            onDisconnect:function(msg){
                //console.table(msg);
            },
            onUnblocked:function(jid){
                $scope.buddies[$scope.getBuddyIndex(jid)].isBlocked = false;
                $scope.$digest();
            }
        });
    };
   
    $scope.addBuddy=function(buddy){        
        $scope.buddies.push(buddy);
    };
    
    $scope.editBuddy=function(jid){
        var buddyDetails = $scope.buddies[$scope.getBuddyIndex(jid)];
        $("#txtJid").val(buddyDetails.jid);
        $("#txtName").val(buddyDetails.name);
        $("#txtGroup").val(buddyDetails.group.join(","));        
        $("#addNewContactForm").toggle();
    };
    
    $scope.removeBuddy=function(jid){
        xmppClient.presence.unsubscribe(jid);
        xmppClient.roster.remove(jid);
    };
    
    $scope.blockBuddy=function(jid){
        xmppClient.blockUser(jid);
    };
    
    $scope.unblockBuddy=function(jid){
        xmppClient.unblockUser(jid);
    };
    
    $scope.talkTo=function(jid){
        $scope.chatType=xmppClient.message.Type.CHAT;
        CHAT_WITH_JID=jid;
        
        var found=false;
        
        messages[jid]=[];
        
        if(!found){ 
            $scope.name=$scope.getName(jid);            
            $scope.chats=[];
        }else{
            $scope.name=$scope.getName(jid);
            $scope.chats=messages[jid];
        }
        
        $scope.buddies[$scope.getBuddyIndex(jid)].newMessagesCount = 0;
        $("#txtMessage").focus();        
        xmppClient.getArchive(jid, true);
    };
    
    $scope.talkToRoom=function(jid){
        $scope.chatType=xmppClient.message.Type.GROUPCHAT;
        CHAT_WITH_JID=jid;
        
        $scope.name=$scope.getRoomName(jid);
        $scope.chats=[];

        $("#txtMessage").focus();        
        xmppClient.getArchiveRoom(jid);
    };
    
    $scope.sendMessage=function(){
        var message = $("#txtMessage").val();
        $("#txtMessage").val('');
        $("#txtMessage").focus();

        if(message.length===0){
            return;
        }

        if(CHAT_WITH_JID===null){
            alert("please select a user to chat");
            return;
        }

        var messageId = xmppClient.sendMessage(message, CHAT_WITH_JID);        
        $scope.saveMessage(messageId, CHAT_WITH_JID, 'you', message, '', 'pending');                
        $scope.scrollToBottom();    
    };
    
    $scope.sendMessageToRoom=function(){
        var message = $("#txtMessage").val();
        $("#txtMessage").val('');
        $("#txtMessage").focus();

        if(message.length===0){
            return;
        }

        if(CHAT_WITH_JID===null){
            alert("please select a user to chat");
            return;
        }

        var messageId = xmppClient.MUC.sendMessage(message, CHAT_WITH_JID);
    };
    
    /*
    * This function will save the message in local object "messages"
    * 
    * @param {String} id - message id
    * @param {String} jid - jid of user we are chating with
    * @param {String} name - name of user who sent message
    * @param {String} message - message text
    * @param {String} date - datetime of message
    * @param {String} status - status of sent message
    * @param {String} type - type of message: chat/ offline/ archive
    * 
    */
    $scope.saveMessage=function(id, jid, name, message, dateTime, status, type){

        if(messages[jid]===undefined){
            messages[jid]=[];
        }

        if(dateTime===undefined || dateTime.length===0){
            dateTime = Calander.getCurrentDateTime();
        }

        if(type==="archive"){
            tmpArchivedMessages.push({id:id, name:name, message:message, time:dateTime, status:status});
        }else{
            messages[jid].push({id:id, name:name, message:message, time:dateTime, status:status});
        }

        $scope.updateChats(jid);        
    };
    
    $scope.updateChats=function(jid){
        if(jid===CHAT_WITH_JID){
            $scope.chats=messages[jid];            
        }else{
            $scope.buddies[$scope.getBuddyIndex(jid)].newMessagesCount++;
            $scope.buddies[$scope.getBuddyIndex(jid)].flow = new Date().getTime();
        }
        
        setTimeout(function(){
            $scope.$apply();
        },100);
        
        //$scope.$digest();
    };
    
    $scope.getBuddyIndex=function(jid){
        for(var i in $scope.buddies){
            if($scope.buddies[i].jid === jid){
                return i;                
            }
        }
    };
    
    $scope.pushArchiveMessages = function(){
        for(var i=tmpArchivedMessages.length; i>0; i--){
            messages[CHAT_WITH_JID].unshift(tmpArchivedMessages[i-1]);
        }

        $scope.updateChats(CHAT_WITH_JID);
        tmpArchivedMessages=[];
    };
    
    $scope.txtMessageOnKeyListener = function($event){
        if($event.keyCode===13){
            if($scope.chatType=='groupchat'){
                $scope.sendMessageToRoom();
            }else{
                $scope.sendMessage();
            }
        }
    };
    
    $scope.getArchive = function(){
        xmppClient.getArchive(CHAT_WITH_JID, false);
    };
    
    $scope.scrollToBottom=function(){
        if(!scrollLocked){
            setTimeout(function(){
                $('#result').scrollTop($('#result')[0].scrollHeight);
            },200);
        }
    };
    
    $scope.getName = function(jid){        
        for(var i=0; i<$scope.buddies.length; i++){
            if($scope.buddies[i].jid.toLowerCase() === jid.toLowerCase()){
                if($scope.buddies[i].name.length > 0){
                    return $scope.buddies[i].name;
                }else{
                    return jid.split("@")[0];
                }                                
            }
        }
    }
    
    $scope.getRoomName = function(jid){
        for(var i=0; i<$scope.rooms.length; i++){
            if($scope.rooms[i].jid.toLowerCase() === jid.toLowerCase()){
                if($scope.rooms[i].name.length > 0){
                    return $scope.rooms[i].name;
                }else{
                    return jid.split("@")[0];
                }                                
            }
        }
    }
    
    $scope.joinRoom=function(roomJID){
        xmppClient.MUC.joinRoom(roomJID, xmppClient.username, xmppClient.MUC.HistoryType.MAXSTANZAS, 5);
    }
    
    $scope.notify = function(message){
        $scope.notifictions.splice(0,0,new Date().toLocaleTimeString() + ": " + message);
        $scope.$digest();
    }
    
    /**
    * XMPP Code
    **/
   
    $scope.addRosterEntry = function(){
        var jid=$("#txtJid").val();
        var name=$("#txtName").val();
        var group=$("#txtGroup").val().split(',');        

        xmppClient.roster.add(jid,name,group);

        if(!$scope.getBuddyIndex(jid)){
            var status=$("#txtStatus").val();
            setTimeout(function(){
                xmppClient.presence.subscribe(jid, status);
            },1000);
        }
    };
    
    xmppClient.onRosterReceive = function(roster){
        console.log("function: onRosterReceive");
        //console.table(roster);
        
        roster.forEach(function(contact){
            if(contact.name.length===0){
                contact.name=$scope.getName(contact.jid);
            }
            contact.status="unavailable";
            contact.isBlocked=false;
            contact.state="";
            contact.newMessagesCount=0;
            contact.flow = 0;
            $scope.buddies.push(contact);
        });
        
        //console.table($scope.buddies);                
        $scope.$digest();
    };
    
    xmppClient.onMessageReceive = function(message){
        console.log("function: onMessageReceive");
        console.table(message);
        if(!isMessageValid(message.text)){
            return;
        }

        var fromJid=message.from.split('/')[0];

        if(CHAT_WITH_JID === null){
            CHAT_WITH_JID = fromJid;
            if(message.type != xmppClient.message.Type.GROUPCHAT){
                xmppClient.getArchive(CHAT_WITH_JID, true);
                return;
            }
        }

        if(message.via === "carbon"){
            $scope.saveMessage(message.id, message.to, 'you', message.text, '', '', message.via);
        }else if(message.via === "groupchat"){
            var dateTime = (message.delay === undefined)?'':message.delay.time;
            var name = message.from.split('/')[1];            
            $scope.saveMessage(message.id, fromJid, name, message.text, dateTime, '', message.via);
        }else if(message.via === "archive"){
            if(message.type == xmppClient.message.Type.GROUPCHAT){
                var dateTime = (message.delay === undefined)?'':message.delay.time;
                var name = message.from.split('/')[1];            
                $scope.saveMessage(message.id, fromJid, name, message.text, dateTime, '', message.via);
            }else{
                if(fromJid === xmppClient.username + "@" + xmppClient.host){
                    $scope.saveMessage(message.id, CHAT_WITH_JID, 'you', message.text, Calander.strToTime(message.delay.time), '', message.via);
                }else{
                    var dateTime = (message.delay === undefined)?'':message.delay.time;
                    $scope.saveMessage(message.id, fromJid, $scope.getName(fromJid), message.text, Calander.strToTime(dateTime), '', message.via);
                }
            }
        }else{
            var dateTime = (message.delay === undefined)?'':message.delay.time;
            $scope.saveMessage(message.id, fromJid, $scope.getName(fromJid), message.text, dateTime, '', message.via);
            $scope.scrollToBottom();
        }
        
    };    

    xmppClient.onPresenceReceive = function(presence){
        console.log("function: onPresenceReceive");
        //console.table(presence);
        
        if(presence.userType === xmppClient.presence.UserType.USER){
            var jid=presence.from.split("/")[0];
            for(var i in $scope.buddies){
                if($scope.buddies[i].jid === jid){
                    $scope.buddies[i].status = presence.type;
                }
            }
        }else{
            var roomJid=presence.from.split("/")[0];
            var nick=presence.from.split("/")[1];
            for(var i in $scope.rooms){
                if($scope.rooms[i].jid === roomJid){                    
                    if(presence.type === xmppClient.presence.Type.AVAILABLE){
                        $scope.rooms[i].members.push(presence);
                    }else{
                        for(var j in $scope.rooms[i].members){
                            if($scope.rooms[i].members[j].from === presence.from){
                                $scope.rooms[i].members.splice(j,1);
                            }
                        }
                    }
                }
            }
            console.table($scope.rooms);
        }
        
        //$scope.$digest();
        $scope.notify(presence.from + " [" +presence.type + "]");
        //showNotification(presence.from + " [" +presence.type + "]");
    };

    xmppClient.onSubscriptionRequestReceive = function(presence){
        console.log("function: onSubscriptionRequestReceive");

        var isLoggedInUserSubscribedToSendersPresence = false;
        $scope.buddies.forEach(function(buddy){
            //If user1 is already subscribed to user2's presence then accept the 
            //subscription request sent by user2
            if(buddy.jid === presence.from && buddy.subscription === "to"){
                isLoggedInUserSubscribedToSendersPresence = true;            
            }
        });

        if(isLoggedInUserSubscribedToSendersPresence){
            xmppClient.presence.acceptSubscriptionRequest(presence.from);
        }else{
            var status="Want's to add you as friend";

            if(presence.status!==undefined){
                status = presence.status;
            }

            var data="<div id='subscriptionRequest' style='text-align:center; background:#cdcdcd'><b>" + presence.from + "</b> " + status + "<br/>";
            data+="<button onclick=acceptFriendRequest('" + presence.from + "')>Accept</button>";
            data+="<button onclick=rejectFriendRequest('" + presence.from + "')>Reject</button>";
            data+="</div>";
            showNotification(data);    
        }

    };

    xmppClient.onSubscriptionRequestAccept = function(params){
        console.log("function: onSubscriptionRequestAccept");
    };

    xmppClient.onTypingStatusChange = function(fromJid, status){
        console.log(fromJid + " is " + status);

        if(status==="active"){
            status="";
        }

        var jid = fromJid.split("/")[0];
        for(var i in $scope.buddies){
            if($scope.buddies[i].jid===jid){
                $scope.buddies[i].state=status;
            }
        }

        $scope.$digest();
    };

    xmppClient.onDelivered = function(deliveredToJid, msgId){
        console.log("function: onDelivered");
        var jid = deliveredToJid.split("/")[0];

        for(var i in messages[jid]){
            if(messages[jid][i].id===msgId){
                messages[jid][i].status = 'delivered';
            }
        }

        $scope.updateChats(jid);
    };

    xmppClient.onArchiveReceive = function(object){        
        console.log("function: onArchiveReceive");
        var scrollTo = "10";
        isArchiveComplete[object.jid]=object.complete;        
        
        if($scope.chats.length === 0 || object.jid !== CHAT_WITH_JID){
            scrollTo="bottom";
        }

        $scope.pushArchiveMessages();
        if(scrollTo === "bottom"){
           $scope.scrollToBottom();
        }else if(scrollTo === "10"){
            $('#result').scrollTop(10);
        }
    };

    xmppClient.onRosterPush = function(object){
        console.log("function: onRosterPush");
        //console.table(object);

        var isContactExists = false;
        var isUpdated = false;

        for(var i in $scope.buddies){
            if($scope.buddies[i].jid===object.jid){
                $scope.buddies[i].subscription=object.subscription
                $scope.buddies[i].ask=object.ask
                $scope.buddies[i].name=object.name
                isContactExists = true;
            }
        }

        if(!isContactExists){
            object.status="unavailable";
            object.state="";
            object.isBlocked=false;
            object.newMessagesCount=0;
            object.flow = 0;

            $scope.buddies.push(object);
        }
        
        $scope.$digest();
    };

    xmppClient.onRosterEntryRemove = function(object){
        console.log("function: onRosterEntryRemove");
        for(var i in $scope.buddies){
            if($scope.buddies[i].jid === object.jid){
                $scope.buddies.splice(i,1);
                break;
            }
        }
        xmppClient.presence.cancelSubscriptionRequest(object.jid);
        $scope.$digest();
    };

    xmppClient.onBlockListReceive = function(blockedList){
        console.log("function: onBlockListReceive");
        for(var i in blockedList){
            for(var j in $scope.buddies){
                if($scope.buddies[j].jid === blockedList[i]){
                    $scope.buddies[j].isBlocked=true;
                    break;
                }
            }
        }
        $scope.$digest();
    };
    
    xmppClient.onBlocked=function(jid){
        console.log("function: onBlocked");
        $scope.buddies[$scope.getBuddyIndex(jid)].isBlocked=true;
        $scope.$digest();
    };
    
    xmppClient.onMUCRoomsReceive = function(rooms){
        console.table(rooms);
        rooms.forEach(function(room){
            room.members=[];
        })
        
        $scope.rooms=rooms;
        //xmppClient.MUC.joinRoom('room1@conference.ejabberdnode1',xmppClient.username);
    };
    
    xmppClient.onMUCUsersReceive = function(users){
        console.table(users);
    };
    
    xmppClient.onError=function(error){
        //console.table(error);
        $scope.notify(error.message);
    }
    
    if(getParameterByName("jid").length>0 && getParameterByName("pass").length>0 && getParameterByName("res").length>0){
        $scope.connect(getParameterByName("jid"), getParameterByName("pass"), getParameterByName("res"));
    }else{
        $("#loginWrapper").show();
        $("#bgDisabled").show();
    }
    
});
/**
* Custom Functions
**/

function makeRosterEntry(){
    var jid=$("#txtJid").val();
    var name=$("#txtName").val();
    var group=$("#txtGroup").val().split(',');
    var status=$("#txtStatus").val();
    
    xmppClient.roster.add(jid,name,group);
    
    setTimeout(function(){
        xmppClient.presence.subscribe(jid, status);
    },1000);
}

function updateRosterEntry(){
    var jid=$("#txtJid").val();
    var name=$("#txtName").val();
    var group=$("#txtGroup").val().split(',');
    
    xmppClient.roster.add(jid,name,group);
}

function getRosterEntries(){
    xmppClient.roster.get();
}

function acceptFriendRequest(jid){
    xmppClient.presence.acceptSubscriptionRequest(jid);
    xmppClient.presence.subscribe(jid);
    $("#subscriptionRequest").hide();
}

function rejectFriendRequest(jid){
    xmppClient.presence.rejectSubscriptionRequest(jid);
    $("#subscriptionRequest").hide();
}

function showNotification(text){
    //$("#notifications").append("<div>" + text + "</div>");
}

function talkTo(jid){    
    CHAT_WITH_JID=jid;
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function isMessageValid(message){
    if(message.search(/\[\[type:.*]]/i)>=0){
        return false;
    }
    
    if(message==="ping-push-blocked-messages"){
        return false;
    }
    
    return true;
}


function chatWindowOnScroll(event){
    var ele = document.getElementById("result");
    
    if(ele.clientHeight + ele.scrollTop == ele.scrollHeight){
        scrollLocked=false;
    }else{
        scrollLocked=true;
    }
    
    if(ele.scrollTop == 0 && isArchiveComplete[CHAT_WITH_JID] == "false"){
        var $scope = angular.element(document.getElementById('buddies')).scope();
        $scope.getArchive();
    }

    if(ele.clientHeight+ele.scrollTop === ele.scrollHeight && event.deltaY>0){
        event.preventDefault();        
    }
    
    if(ele.scrollTop === 0 && event.deltaY<0){
        event.preventDefault();
    }
}

var Calander = {
    getMonthName:function(month){
        if(!month){
            month = new Date().getMonth();
        }
        var months = ['January', 'Februay', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month];
    },
    getCurrentDateTime:function(){
        var dateTime = "";
        
        dateTime += new Date().getDate() + "-" + this.getMonthName() + "-" + new Date().getFullYear() + " ";
        dateTime += new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds();

        return new Date().toLocaleString().replace(new RegExp("/",'g'),"-");
    },
    strToTime:function(time){
        var month = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        var monthMin = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var date = new Date(time).toLocaleDateString();
        var time = new Date(time).toLocaleTimeString();
        dateArray = date.split("/");
        dateTime = dateArray[1] + "-" + monthMin[dateArray[0]-1] + "-" + dateArray[2] + ", " + time;
        return dateTime;
    }
};

function Buddy(){
    var buddy = {
        jid:jid,
        name:name,
        subscription:subscription,
        group:group,
        ask:ask,
        status:status,
        isBlocked:isBlocked,
        state:state,
        newMessageCount:0,
        flow:0
    };
    
    return buddy;
}
$("#btnEditRosterEntry").click(function(){
    alert(1);   
});
$("#addNewContact > span").click(function(){
    $("#addNewContactForm").toggle();
});

//$("#btnAddRosterEntry").click(function(){
//    makeRosterEntry();
//});

$("#btnAddRosterEntryClose").click(function(){
    $("#addNewContactForm").toggle();
});