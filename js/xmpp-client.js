var USERNAME = "";
var PASSWORD = "";
var HOST = "ejabberd.local";
var JID = USERNAME + "@" + HOST;
var HTTP_WS_URL = "http://" + HOST + ":5280/http-bind/";
var RESOURCE = "web";
var NOTIFICATION_DURATION = 2000;
var queue = [];
var messageSentInProgress = false;
var Base64 = {_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", encode:function(e){var t = ""; var n, r, i, s, o, u, a; var f = 0; e = Base64._utf8_encode(e); while (f < e.length){n = e.charCodeAt(f++); r = e.charCodeAt(f++); i = e.charCodeAt(f++); s = n >> 2; o = (n & 3) << 4 | r >> 4; u = (r & 15) << 2 | i >> 6; a = i & 63; if (isNaN(r)){u = a = 64} else if (isNaN(i)){a = 64}t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a)}return t}, decode:function(e){var t = ""; var n, r, i; var s, o, u, a; var f = 0; e = e.replace(/[^A-Za-z0-9\+\/\=]/g, ""); while (f < e.length){s = this._keyStr.indexOf(e.charAt(f++)); o = this._keyStr.indexOf(e.charAt(f++)); u = this._keyStr.indexOf(e.charAt(f++)); a = this._keyStr.indexOf(e.charAt(f++)); n = s << 2 | o >> 4; r = (o & 15) << 4 | u >> 2; i = (u & 3) << 6 | a; t = t + String.fromCharCode(n); if (u != 64){t = t + String.fromCharCode(r)}if (a != 64){t = t + String.fromCharCode(i)}}t = Base64._utf8_decode(t); return t}, _utf8_encode:function(e){e = e.replace(/\r\n/g, "\n"); var t = ""; for (var n = 0; n < e.length; n++){var r = e.charCodeAt(n); if (r < 128){t += String.fromCharCode(r)} else if (r > 127 && r < 2048){t += String.fromCharCode(r >> 6 | 192); t += String.fromCharCode(r & 63 | 128)} else{t += String.fromCharCode(r >> 12 | 224); t += String.fromCharCode(r >> 6 & 63 | 128); t += String.fromCharCode(r & 63 | 128)}}return t}, _utf8_decode:function(e){var t = ""; var n = 0; var r = c1 = c2 = 0; while (n < e.length){r = e.charCodeAt(n); if (r < 128){t += String.fromCharCode(r); n++} else if (r > 191 && r < 224){c2 = e.charCodeAt(n + 1); t += String.fromCharCode((r & 31) << 6 | c2 & 63); n += 2} else{c2 = e.charCodeAt(n + 1); c3 = e.charCodeAt(n + 2); t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63); n += 3}}return t}};
var sid = "";

var rid=2341623496;

function getRid(){
    rid++;
    return rid;
}

function getMessageId(){
    return "msg_" + new Date().getTime();
}

function sendToServer(stanza, requestTag, callback){
    log("Sent: " + stanza);
    xmppClient.socket.send(stanza);
}

var xmppClient={
    onFailure:null,
    onSuccess:null,
    onDisconnect:null,
    socket:null,
    xmlNodeType:{
        NORMAL: 1,
        TEXT: 3,
        CDATA: 4,
        FRAGMENT: 11
    },
    connect:function(params){        
        
        USERNAME=params.username;
        PASSWORD=params.password;
        
        if(params.host!==undefined){
            HOST=params.host;            
        }
        
        JID=USERNAME + "@" + HOST;
        
        if(params.http_ws_url!==undefined){
            HTTP_WS_URL=params.http_ws_url;
        }else{
            HTTP_WS_URL="ws://" + HOST + ":5280/http-ws/";
        }
        
        if(params.resource!==undefined){
            RESOURCE=params.resource;
        }
        
        if(params.failure!==undefined){
            this.onFailure = params.failure;
        }
        
        if(params.success!==undefined){
            this.onSuccess = params.success;
        }
        
        if(params.onDisconnect!==undefined){
            this.onDisconnect = params.onDisconnect;
        }
        
        this.socket = new WebSocket(HTTP_WS_URL, "xmpp");
        
        this.socket.onopen = function (event) {
            xmppClient.start();
        };
        
        this.socket.onmessage = function (event) {            
            log("Received: " + event.data);
            parser.parseServerResponse(event.data);
        };
        
        this.socket.onerror = function (event) {            
            console.log(event);
        };
    },    
    start:function(){
        var data = this.generateStanza("open",{"xmlns":"urn:ietf:params:xml:ns:xmpp-framing", "to":"ejabberd.local", "version":"1.0"});
        sendToServer(data);
    },
    auth:function(){
        var auth = Base64.encode(JID + "\u0000" + USERNAME + "\u0000" + PASSWORD);
        var data = this.generateStanza("auth",{'xmlns':'urn:ietf:params:xml:ns:xmpp-sasl', 'mechanism':'PLAIN'},auth);
        sendToServer(data);
    },
    restart:function(){
        var data = this.generateStanza("open",{"xmlns":"urn:ietf:params:xml:ns:xmpp-framing", "to":"ejabberd.local", "version":"1.0"});
        sendToServer(data);
    },
    bind:function(){
        var data = "<iq type='set' id='_bind_auth_2' xmlns='jabber:client'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>" + RESOURCE + "</resource></bind></iq>";
        sendToServer(data);
    },
    session:function(){
        var data = "<iq type='set' id='_session_auth_2' xmlns='jabber:client'><session xmlns='urn:ietf:params:xml:ns:xmpp-session'/></iq>";
        sendToServer(data, "session");
    },
    getRosterEntries:function(){
        var data = "<iq type='get' id='1:roster' xmlns='jabber:client'><query xmlns='jabber:iq:roster'/></iq>";
        //data += "<iq type='set' xmlns='jabber:client' id='2:sendIQ'><enable xmlns='urn:xmpp:carbons:2'/></iq>";
        //data += "<iq type='get' xmlns='jabber:client' id='3:sendIQ'><query xmlns='jabber:iq:private'><storage xmlns='storage:bookmarks'/></query></iq>";
        //data += "<iq type='get' id='4:pubsub' xmlns='jabber:client'><pubsub xmlns='http://jabber.org/protocol/pubsub'><items node='storage:bookmarks'/></pubsub></iq>";
        //data += "<iq type='get' from='" + JID + "' xmlns='jabber:client' id='5:sendIQ'><query xmlns='jabber:iq:privacy'><list name='ignore'/></query></iq>";
        sendToServer(data);
    },
    getPresenceInfo:function(){
        var data = "<presence id='pres:7' xmlns='jabber:client'><priority>1</priority><c xmlns='http://jabber.org/protocol/caps' hash='sha-1' node='' ver='kR9jljQwQFoklIvoOmy/GAli0gA='/></presence>";
        sendToServer(data);
    },
    getOfflineMessages:function(){
        var data = "<iq type='set' from='" + JID + "' xmlns='jabber:client' id='6:sendIQ'><query xmlns='jabber:iq:privacy'><active name='ignore'/></query></iq>";
        data+="<presence id='pres:7' xmlns='jabber:client'><priority>1</priority><c xmlns='http://jabber.org/protocol/caps' hash='sha-1' node='' ver='kR9jljQwQFoklIvoOmy/GAli0gA='/></presence>";
        sendToServer(data, "getOfflineMessages");
    },
    sendPingResponse:function(from, to, id){
        var data = "<iq from='" + from + "' to='" + to + "' id='" + id + "' type='result' xmlns='jabber:client'><ping xmlns='urn:xmpp:ping'/></iq>";
        sendToServer(data);
    },
    sendMessage:function(message, toJID){      
        var messageId = getMessageId();
        var data = "<message id='" + messageId + "' from='" + JID + "/" + RESOURCE + "' to='" + toJID + "' type='chat'><body>" + message + "</body>";
        //data += "<active xmlns='http://jabber.org/protocol/chatstates'/>";
        //data += "<x xmlns='jabber:x:event'><offline/><delivered/><displayed/><composing/></x>";
        data += "<request xmlns='urn:xmpp:receipts'></request>";
        data += "</message>";
        sendToServer(data);
        return messageId;
    },
    sendReceipt:function(messageId, toJID){
        toJID = toJID.split("/")[0];
        var data = "<message id='" + getMessageId() + "' xmlns='jabber:client' from='" + JID + "/" + RESOURCE + "' to='" + toJID + "' type='chat'>";
        data += "<received id='" + messageId + "' xmlns='urn:xmpp:receipts'></received>";
        data += "</message>";
        sendToServer(data);
    },
    generateStanza:function(elementName, elementAttributes, elementText){
        return new XMLGenerator(elementName, elementAttributes, elementText).toString()
    }
};

xmppClient.roster = {
    add:function(jid, name, group){
        var data="<iq from='" + JID + "' type='set' id='set1'><query xmlns='jabber:iq:roster'><item jid='" + jid + "' name='" + name + "'><group>" + group + "</group></item></query></iq>";
        sendToServer(data, "roster_add",  xmppClient.presence.subscribe(jid));
    },
    get:function(){
        var data="<iq from='" + JID + "' type='get' id='1:roster' xmlns='jabber:client'><query xmlns='jabber:iq:roster'/></iq>";
        sendToServer(data, "roster_get");
    }
};

xmppClient.presence = {
    subscribe:function(jid){
        var data="<presence to='" + jid + "' type='subscribe'/>";
        sendToServer(data, "presence_subscribe");
    },
    acceptSubscriptionRequest:function(toJID){
        var data="<presence to='" + toJID + "' type='subscribed'/>";
        xmppClient.presence.subscribe(toJID);
        sendToServer(data, "presence_accept_subscription_request");
    },
    rejectSubscriptionRequest:function(toJID){
        var data="<presence to='" + toJID + "' type='unsubscribed'/>";
        sendToServer(data, "presence_reject_subscription_request");
    }
};

xmppClient.stanzas = {
    message:function(){
        
    },
    presence:function(){
        
    },
    iq:function(){
        
    }
};

/******************************
 *Parsers
 ******************************/

var parser={
    parseServerResponse:function(xml){
        //$("#logs").append($("<div />").text(xml).html());
        //$("#logs").append("<br/><br/>");
        var rootTagName = $(xml)[0].tagName;
        //console.log(rootTagName + ": " + xml);
        xml = $.parseXML(xml);
        switch(rootTagName){
            case "STREAM:FEATURES":
                if($(xml).find("mechanism").length>0){
                    xmppClient.auth();
                }else if($(xml).find("bind").length>0){
                    xmppClient.bind();
                }
                break;
            case "SUCCESS":
                xmppClient.restart();
                break;
            case "IQ":                
                if($(xml).find("bind").length>0){
                    xmppClient.session();
                }else if($(xml).find("iq").attr("id")==="_session_auth_2"){
                    xmppClient.getRosterEntries();
                }else if($(xml).find("iq").attr("id")==="1:roster"){
                    xmppClient.getPresenceInfo();
                    this.parseRosterEntries(xml);
                }else if($(xml).find("iq > ping").length>0){
                    var from = $(xml).find("iq").attr("to").split("/")[0];
                    var to = $(xml).find("iq").attr("from");
                    var id = $(xml).find("iq").attr("id");
                    xmppClient.sendPingResponse(from, to, id);
                }
                break;
            case "PRESENCE":    
                this.parsePresence(xml);
                break;
            case "MESSAGE":
                this.parseMessages(xml);
                break;
        }
            
        if($(xml).find("body").attr("type")==="terminate"){
            xmppClient.onDisconnect("connection terminated.");
        }
    },
    parseRosterEntries:function(xml){
        console.log("parsing roster");
        var jid=null;
        var name=null;
        var subscription=null;
        var roster=[];
        $(xml).find("query > item").each(function(){
            
            jid=$(this).attr("jid");
            name=$(this).attr("name");
            
            if(name===undefined){
                name=jid.split("@")[0];
            }
            
            subscription=$(this).attr("subscription");
            group=$(this).find("group").text();
            
            roster.push({jid:jid, name:name, subscription:subscription, group:group}); 
            
        });
        interface.rosterReceiveCallback(roster);
    },
    parseMessages:function(xml){
        console.log("parsing messages");
        //console.log("Message: " + xml);
        $(xml).find("message").each(function(){
            if($(xml).find("body").length>0){
                var objMessage = {};
                objMessage['id'] = $(this).attr('id');
                objMessage['from'] = $(this).attr('from');
                objMessage['text'] = $(this).find("body").text();
                
                if($(this).find("delay").length>0){
                    objMessage['delay'] = {};
                    objMessage['delay']['text'] = $(this).find("delay").text();
                    objMessage['delay']['time'] = $(this).find("delay").attr("stamp");
                }
                
                if($(this).find("request").length>0 && $(this).find("request").attr("xmlns")==="urn:xmpp:receipts"){
                    xmppClient.sendReceipt($(this).attr("id"), $(this).attr("from"));
                }
                
                interface.messagReceiveCallback(objMessage);
                
            }else if($(this).find("composing").length>0){
                interface.typingStatusChangeCallback($(this).attr('from'), "composing");
            }else if($(this).find("paused").length>0){
                interface.typingStatusChangeCallback($(this).attr('from'), "paused");
            }else if($(this).find("inactive").length>0){
                interface.typingStatusChangeCallback($(this).attr('from'), "inactive");
            }else if($(this).find("gone").length>0){
                interface.typingStatusChangeCallback($(this).attr('from'), "gone");
            }else if($(this).find("active").length>0 && $(this).find("body").length===0){
                interface.typingStatusChangeCallback($(this).attr('from'), "active");
            }else if($(this).find("received").length>0){
                interface.deliveryReceiptCallback($(this).attr("from"), $(this).find("received").attr('id'));
            }
        });
        
    },
    parsePresence:function(xml){
        $(xml).find("presence").each(function(){
            var from=$(this).attr("from");
            var type=$(this).attr("type"); //unavailable=offline,subscribe=subscribe request
            if(type===undefined){
                type="available";
            }
            if(JID !== from.split("/")[0]){
                if(type==='subscribe'){
                    interface.subscriptionRequestReceive({from:from, type:type});
                }else{
                    interface.presenceReceiveCallback({from:from, type:type});
                }
            }
        });
    }
};

var interface={
    messagReceiveCallback:null,
    rosterReceiveCallback:null,
    presenceReceiveCallback:null,
    subscriptionRequestReceive:null,
    typingStatusChangeCallback:null,
    deliveryReceiptCallback:null,
    onMessagReceive:function(callbackFunction){
        this.messagReceiveCallback=callbackFunction;
    },
    rosterCallback:function(callbackFunction){
        this.rosterReceiveCallback=callbackFunction;
    },
    onPresenceReceive:function(callbackFunction){
        this.presenceReceiveCallback=callbackFunction;
    },
    onSubscriptionRequestReceive:function(callbackFunction){
        this.subscriptionRequestReceive=callbackFunction;
    },
    onTypingStatusChange:function(callbackFunction){
        this.typingStatusChangeCallback=callbackFunction;
    },
    onDelivered:function(callbackFunction){
        this.deliveryReceiptCallback=callbackFunction;
    }
};

function log(data){
    //console.log(data);
}

XMLGenerator = function(elementName, elementAttributes, elementText){
    var xmlDocument = document.implementation.createDocument('jabber:client', 'xmppClient', null);    
    var rootElement = xmlDocument.createElement(elementName);
    
    for(var key in elementAttributes){
        rootElement.setAttribute(key,elementAttributes[key]);
    }
    
    if(elementText !== undefined){
        rootElement.appendChild(xmlDocument.createTextNode(elementText));
    }

    this.obj = rootElement;
};

XMLGenerator.prototype = {    
    toString:function(){
        var result;
        var obj = this.obj;
        
        result = '<' + obj.nodeName;

        for(var i=0; i<obj.attributes.length; i++){
            result += " " + obj.attributes[i].name + "='" + obj.attributes[i].value + "'";
        }

        result += ">";

        if(obj.childNodes.length>0){
            for(var i=0; i<obj.childNodes.length; i++){
                if(obj.childNodes[i].nodeType === xmppClient.xmlNodeType.TEXT){
                   result += obj.childNodes[i].nodeValue; 
                }
            }
        }

        result += "</" + obj.nodeName + ">";

        return result;
    },
    printObject:function(){
        console.log(this.obj);
        return this;
    }
};

//console.log(new XMLGenerator("open",{"xmlns":"urn:ietf:params:xml:ns:xmpp-framing", "to":"ejabberd.local", "version":"1.0"},"hi").toString());