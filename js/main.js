var contacts=null;
var CHAT_WITH_JID=null;
var chat=angular.module('chat',[]);
var messages={};

xmppClient.connect({
    username:getParameterByName('jid'), 
    password:getParameterByName('pass'), 
    host:'ejabberd.local',
    http_ws_url:'ws://ejabberd.local:5280/http-ws',
    onFailure:function(msg){
        if(msg==="not-authorized"){
            alert("Invalid username/ password");
        }
    },
    onSuccess:function(msg){
        console.log(msg);
    },
    onDisconnect:function(msg){
        console.log(msg);
    }
});

chat.controller('Chat',function($scope){    
    $scope.activeChats=[];
    $scope.buddies=[];
    $scope.chats=[];
    
    $scope.tabOnClick=function(jid){        
        CHAT_WITH_JID=jid;
        for(var i in $scope.activeChats){
            if($scope.activeChats[i].jid===jid){
                $scope.activeChats[i].isSelected=1;
            }else{
                $scope.activeChats[i].isSelected=0;
            }
        }
        $scope.chats=messages[jid];
        $("#txtMessage").focus();
    };         
    
    $scope.addBuddy=function(buddy){        
        $scope.buddies.push(buddy);
    };
    
    $scope.talkTo=function(jid){
        CHAT_WITH_JID=jid;
        
        var found=false;
        
        for(var i in $scope.activeChats){
            $scope.activeChats[i].isSelected=0;
            if($scope.activeChats[i].jid===jid){
                $scope.activeChats[i].isSelected=1;
                found=true;
            }
        }
        
        if(!found){ 
            $scope.activeChats.push({name:getName(jid), jid:jid, isSelected:1});
            $scope.chats=[];
        }else{
            $scope.chats=messages[jid];
        }
        
        $("#txtMessage").focus();
        xmppClient.getArchive(jid);
    };   
});

function getName(jid){
    for(var i in contacts){
        if(contacts[i].jid===jid){
            if(contacts[i].name.length>0){
                return contacts[i].name;
            }else{
                return jid.split("@")[0];
            }
        }
    }
}

function makeRosterEntry(){
    var jid=$("#txtJid").val();
    var name=$("#txtName").val();
    var group=$("#txtGroup").val();
    xmppClient.roster.add(jid,name,group);
}

function sendMessage(){
    var message = $("#txtMessage").val();
    
    if(message.length===0){
        return;
    }
    
    if(CHAT_WITH_JID===null){
        alert("please select a user to chat");
        return;
    }

    var messageId = xmppClient.sendMessage(message, CHAT_WITH_JID);    
    saveMessage(messageId, CHAT_WITH_JID, 'you', message, '', 'pending');

    $("#txtMessage").val('');
    $("#txtMessage").focus();
}

function updateChats(jid){
    var $scope = angular.element(document.getElementById('buddies')).scope();
    
    $scope.$apply(function() {
        if($scope.activeChats.length<=1 || jid===CHAT_WITH_JID){
            $scope.chats=messages[jid];
        }
    });
}

/*
 * This function will save the message in local object "messages"
 * 
 * @param {String} id - message id
 * @param {String} jid - jid of user we are chating with
 * @param {String} name - name of user who sent message
 * @param {String} message - message text
 * @param {String} date - datetime of message
 * @param {String} status - setatus of sent message
 * 
 */
function saveMessage(id, jid, name, message, date, status){
    
    var dateTime = date;
    
    if(messages[jid]===undefined){
        messages[jid]=[];
    }
    
    if(dateTime===undefined || dateTime.length===0){
        dateTime = "";
        dateTime += new Date().getDate() + "-" + new Date().getMonth() + "-" + new Date().getFullYear() + " ";
        dateTime += new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds();
    }
    
    messages[jid].push({id:id, name:name, message:message, time:dateTime, status:status});
    updateChats(jid);
    $('#result').scrollTop($('#result')[0].scrollHeight);
}


xmppClient.interface.onMessageReceive(function(message){
    if(!isMessageValid(message.text)){
        return;
    }
    
    var jid=message.from.split('/')[0];
    
    if(CHAT_WITH_JID===null){
        CHAT_WITH_JID=jid;
    }
    
    var $scope = angular.element(document.getElementById('wrapper')).scope();
    
    $scope.$apply(function(){
        var found=false;
        for(var i in $scope.activeChats){
            if($scope.activeChats[i].jid===jid){
                found=true;
            }
        }
        if(found===false){
            var isSelected=1;
            if($scope.activeChats.length>0){
                isSelected=0;
            }
            $scope.activeChats.push({name:getName(jid), jid:jid, isSelected:isSelected});
        }
    });
    
    if(message.delay!==undefined){
        saveMessage(message.id, jid, getName(jid), message.text, message.delay.time);
    }else{
        saveMessage(message.id, jid, getName(jid), message.text, '', '');
    }
    
    //$("#result").append("<div class='chat-message'>" + message.from + ": " + message.text + "</div>");    
});

xmppClient.onRosterReceive=function(roster){
    contacts=roster;
    
    for(var i in contacts){
        if(contacts[i].name.trim().length===0){
            contacts[i].name = contacts[i].jid.split("@")[0];
        }
        contacts[i].status="unavailable";
        contacts[i].state="";
    }
    
    showContacts();
};

xmppClient.onPresenceReceive=function(presence){
    var jid=presence.from.split("/")[0];
    var status="";
        
    if(presence.type=="unavailable"){
        status=" is now Offline";
    }else if(presence.type=="subscribe"){
        status=" has sent subscription request";
    }else{
        status=" is now Online";
    }
    
    if(presence.type==="unavailable" || presence.type==="available"){
        for(var i in contacts){
            if(contacts[i].jid===jid){
                contacts[i].status=presence.type;
            }
        }
    }
    showContacts();
    showNotification(presence.from + " [" +presence.type + "]");
};

xmppClient.onSubscriptionRequestReceive=function(params){
    var data="<div style='text-align:center; background:#cdcdcd'><b>" + params.from + "</b>" + " Want's to add you as friend<br/>";
    data+="<button onclick=acceptFriendRequest('" + params.from + "')>Accept</button>";
    data+="<button onclick=rejectFriendRequest('" + params.from + "')>Reject</button>";
    data+="</div>";
    showNotification(data);
};

xmppClient.onTypingStatusChange=function(fromJid, status){
    console.log(fromJid + " is " + status);
    
    if(status==="active"){
        status="";
    }
    
    var jid = fromJid.split("/")[0];
    for(var i in contacts){
        if(contacts[i].jid===jid){
            contacts[i].state=status;
        }
    }
    
    showContacts();
};

xmppClient.onDelivered=function(deliveredToJid, msgId){
    var jid = deliveredToJid.split("/")[0];
    
    for(var i in messages[jid]){
        if(messages[jid][i].id===msgId){
            messages[jid][i].status = 'delivered';
        }
    }
    
    updateChats(jid);
    console.log(msgId);
};

function acceptFriendRequest(jid){
    xmppClient.presence.acceptSubscriptionRequest(jid);
}

function rejectFriendRequest(jid){
    xmppClient.presence.rejectSubscriptionRequest(jid);
}

function showNotification(text){
//    $("#notification").html(text);
//    $("#notification").show("slow",function(){
//        setTimeout(function(){
//            $("#notification").hide("slow");
//        },NOTIFICATION_DURATION);
//    });
    $("#notifications").append("<div>" + text + "</div>");
}

function showContacts(){
    var $scope = angular.element(document.getElementById('buddies')).scope();
    $scope.$apply(function() {
        $scope.buddies=[];
        for(var i in contacts){
            if(contacts[i].status==='available'){
                if(contacts[i].name.length===0){
                    contacts[i].name=getName(contacts[i].jid);
                }
                $scope.buddies.push(contacts[i]);
            }
        }
        
        for(var i in contacts){
            if(contacts[i].status==='unavailable'){
                if(contacts[i].name.length===0){
                    contacts[i].name=getName(contacts[i].jid);
                }
                $scope.buddies.push(contacts[i]);            
            }
        }
    });
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

function txtMessageOnKeyListener(event){
    if(event.keyCode===13){
        sendMessage();
    }
}