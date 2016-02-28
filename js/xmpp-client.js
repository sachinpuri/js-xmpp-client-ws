/* 
 * @project: js-xmpp-client-ws
 * @author: Sachin Puri
 * @website: http://www.sachinpuri.com
 * @repository URL: https://github.com/sachinpuri/js-xmpp-client-ws 
 *  
 */

var xmppClient={
    username:null,
    password:null,
    host:null,
    resource:'web',    
    http_ws_url:null,
    onFailure:null,
    onSuccess:null,
    onDisconnect:null,
    onMessageReceive:null,
    onPresenceReceive:null,
    onSubscriptionRequestReceive:null,
    onTypingStatusChange:null,
    onRosterReceive:null,
    onDelivered:null,
    bareJid:null,
    fullJid:null,
    socket:null,
    connect:function(params){        
        
        for(var property in params){
            this[property]=params[property];
        }
        
        this.fullJid=this.username + "@" + this.host + '/' + this.resource;
        this.bareJid=this.username + "@" + this.host;
        this.socket = new WebSocket(this.http_ws_url, "xmpp");
        
        this.socket.onopen = function (event) {
            xmppClient.start();
        };
        
        this.socket.onmessage = function (event) {            
            log("Received", event.data);
            parser.parseServerResponse(event.data);
        };
        
        this.socket.onerror = function (event) {            
            log("error", event);
        };
        
    },    
    start:function(){
        var data="<open xmlns='urn:ietf:params:xml:ns:xmpp-framing' to='" + this.host + "' version='1.0'/>";
        this.sendToServer(data);
    },
    auth:function(){
        var auth = Base64.encode(this.jid + "\u0000" + this.username + "\u0000" + this.password);
        var data = "<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>" + auth + "</auth>";
        this.sendToServer(data);
    },
    restart:function(){
        var data = "<open xmlns='urn:ietf:params:xml:ns:xmpp-framing' to='" + this.host + "' version='1.0'/>";
        this.sendToServer(data);
    },
    bind:function(){
        var data = "<iq type='set' id='_bind_auth_2' xmlns='jabber:client'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>" + xmppClient.resource + "</resource></bind></iq>";
        this.sendToServer(data);
    },
    session:function(){
        var data = "<iq type='set' id='_session_auth_2' xmlns='jabber:client'><session xmlns='urn:ietf:params:xml:ns:xmpp-session'/></iq>";
        this.sendToServer(data, "session");
    },
    getRosterEntries:function(){
        var data = "<iq type='get' id='1:roster' xmlns='jabber:client'><query xmlns='jabber:iq:roster'/></iq>";
        //data += "<iq type='set' xmlns='jabber:client' id='2:sendIQ'><enable xmlns='urn:xmpp:carbons:2'/></iq>";
        //data += "<iq type='get' xmlns='jabber:client' id='3:sendIQ'><query xmlns='jabber:iq:private'><storage xmlns='storage:bookmarks'/></query></iq>";
        //data += "<iq type='get' id='4:pubsub' xmlns='jabber:client'><pubsub xmlns='http://jabber.org/protocol/pubsub'><items node='storage:bookmarks'/></pubsub></iq>";
        //data += "<iq type='get' from='" + JID + "' xmlns='jabber:client' id='5:sendIQ'><query xmlns='jabber:iq:privacy'><list name='ignore'/></query></iq>";
        this.sendToServer(data);
    },
    getPresenceInfo:function(){
        var data = "<presence id='pres:7' xmlns='jabber:client'><priority>1</priority><c xmlns='http://jabber.org/protocol/caps' hash='sha-1' node='' ver='kR9jljQwQFoklIvoOmy/GAli0gA='/></presence>";
        this.sendToServer(data);
    },
    getOfflineMessages:function(){
        var data = "<iq type='set' from='" + this.fullJid + "' xmlns='jabber:client' id='6:sendIQ'><query xmlns='jabber:iq:privacy'><active name='ignore'/></query></iq>";
        data+="<presence id='pres:7' xmlns='jabber:client'><priority>1</priority><c xmlns='http://jabber.org/protocol/caps' hash='sha-1' node='' ver='kR9jljQwQFoklIvoOmy/GAli0gA='/></presence>";
        this.sendToServer(data, "getOfflineMessages");
    },
    sendPingResponse:function(from, to, id){
        var data = "<iq from='" + from + "' to='" + to + "' id='" + id + "' type='result' xmlns='jabber:client'><ping xmlns='urn:xmpp:ping'/></iq>";
        this.sendToServer(data);
    },
    sendMessage:function(message, toJID){      
        var messageId = this.getMessageId();
        var data = "<message id='" + messageId + "' from='" + this.fullJid + "' to='" + toJID + "' type='chat'>";
        data += "<body>" + message + "</body>";
        //data += "<active xmlns='http://jabber.org/protocol/chatstates'/>";
        //data += "<x xmlns='jabber:x:event'><offline/><delivered/><displayed/><composing/></x>";
        data += "<request xmlns='urn:xmpp:receipts'></request>";
        data += "</message>";
        this.sendToServer(data);
        return messageId;
    },
    sendReceipt:function(messageId, toJID){
        toJID = toJID.split("/")[0];
        var data = "<message id='" + this.getMessageId() + "' xmlns='jabber:client' from='" + this.fullJid + "' to='" + toJID + "' type='chat'>";
        data += "<received id='" + messageId + "' xmlns='urn:xmpp:receipts'></received>";
        data += "</message>";
        this.sendToServer(data);
    },
    generateStanza:function(elementName, elementAttributes, elementText){
        return new XMLGenerator(elementName, elementAttributes, elementText).toString();
    },
    sendToServer:function(stanza){
        log("Sent", stanza);
        xmppClient.socket.send(stanza);
    },
    getMessageId:function(){
        return "msg_" + new Date().getTime();
    }
};

xmppClient.roster = {
    add:function(jid, name, group){
        var data="<iq from='" + xmppClient.fullJid + "' type='set' id='set1'><query xmlns='jabber:iq:roster'><item jid='" + jid + "' name='" + name + "'><group>" + group + "</group></item></query></iq>";
        xmppClient.sendToServer(data, "roster_add",  xmppClient.presence.subscribe(jid));
    },
    get:function(){
        var data="<iq from='" + xmppClient.fullJid + "' type='get' id='1:roster' xmlns='jabber:client'><query xmlns='jabber:iq:roster'/></iq>";
        xmppClient.sendToServer(data, "roster_get");
    }
};

xmppClient.presence = {
    subscribe:function(jid){
        var data="<presence to='" + jid + "' type='subscribe'/>";
        xmppClient.sendToServer(data, "presence_subscribe");
    },
    acceptSubscriptionRequest:function(toJID){
        var data="<presence to='" + toJID + "' type='subscribed'/>";
        xmppClient.presence.subscribe(toJID);
        xmppClient.sendToServer(data, "presence_accept_subscription_request");
    },
    rejectSubscriptionRequest:function(toJID){
        var data="<presence to='" + toJID + "' type='unsubscribed'/>";
        xmppClient.sendToServer(data, "presence_reject_subscription_request");
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
        var rootTagName = $(xml)[0].tagName;
        //log(rootTagName + ": " + xml);
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
            case "FAILURE":
                if($(xml).find("not-authorized").length>0){
                    xmppClient.onFailure("not-authorized");
                }
                break;
        }
            
        if($(xml).find("body").attr("type")==="terminate"){
            xmppClient.onDisconnect("connection terminated.");
        }
    },
    parseRosterEntries:function(xml){
        log("parsing","parsing roster");
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
        xmppClient.onRosterReceive(roster);
    },
    parseMessages:function(xml){
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
                
                xmppClient.onMessageReceive(objMessage);
                
            }else if($(this).find("composing").length>0){
                xmppClient.onTypingStatusChange($(this).attr('from'), "composing");
            }else if($(this).find("paused").length>0){
                xmppClient.onTypingStatusChange($(this).attr('from'), "paused");
            }else if($(this).find("inactive").length>0){
                xmppClient.onTypingStatusChange($(this).attr('from'), "inactive");
            }else if($(this).find("gone").length>0){
                xmppClient.onTypingStatusChange($(this).attr('from'), "gone");
            }else if($(this).find("active").length>0 && $(this).find("body").length===0){
                xmppClient.onTypingStatusChange($(this).attr('from'), "active");
            }else if($(this).find("received").length>0){
                xmppClient.onDelivered($(this).attr("from"), $(this).find("received").attr('id'));
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
            if(this.jid !== from.split("/")[0]){
                if(type==='subscribe'){
                    xmppClient.onSubscriptionRequestReceive({from:from, type:type});
                }else{
                    xmppClient.onPresenceReceive({from:from, type:type});
                }
            }
        });
    }
};

xmppClient.interface={
    onMessageReceive:function(callbackFunction){
        xmppClient.onMessageReceive=callbackFunction;
    },
    onRosterReceive:function(callbackFunction){
        xmppClient.onRosterReceive=callbackFunction;
    },
    onPresenceReceive:function(callbackFunction){
        xmppClient.onPresenceReceive=callbackFunction;
    },
    onSubscriptionRequestReceive:function(callbackFunction){
        xmppClient.onSubscriptionRequestReceive=callbackFunction;
    },
    onTypingStatusChange:function(callbackFunction){
        xmppClient.onTypingStatusChange=callbackFunction;
    },
    onDelivered:function(callbackFunction){
        xmppClient.onDelivered=callbackFunction;
    }
};

function log(tag, data){
    if(arguments.length === 1){
        data = tag;
        tag = "Misc";
    }
    console.log(tag + ": " + data);
}

var Base64 = {_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", encode:function(e){var t = ""; var n, r, i, s, o, u, a; var f = 0; e = Base64._utf8_encode(e); while (f < e.length){n = e.charCodeAt(f++); r = e.charCodeAt(f++); i = e.charCodeAt(f++); s = n >> 2; o = (n & 3) << 4 | r >> 4; u = (r & 15) << 2 | i >> 6; a = i & 63; if (isNaN(r)){u = a = 64} else if (isNaN(i)){a = 64}t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a)}return t}, decode:function(e){var t = ""; var n, r, i; var s, o, u, a; var f = 0; e = e.replace(/[^A-Za-z0-9\+\/\=]/g, ""); while (f < e.length){s = this._keyStr.indexOf(e.charAt(f++)); o = this._keyStr.indexOf(e.charAt(f++)); u = this._keyStr.indexOf(e.charAt(f++)); a = this._keyStr.indexOf(e.charAt(f++)); n = s << 2 | o >> 4; r = (o & 15) << 4 | u >> 2; i = (u & 3) << 6 | a; t = t + String.fromCharCode(n); if (u != 64){t = t + String.fromCharCode(r)}if (a != 64){t = t + String.fromCharCode(i)}}t = Base64._utf8_decode(t); return t}, _utf8_encode:function(e){e = e.replace(/\r\n/g, "\n"); var t = ""; for (var n = 0; n < e.length; n++){var r = e.charCodeAt(n); if (r < 128){t += String.fromCharCode(r)} else if (r > 127 && r < 2048){t += String.fromCharCode(r >> 6 | 192); t += String.fromCharCode(r & 63 | 128)} else{t += String.fromCharCode(r >> 12 | 224); t += String.fromCharCode(r >> 6 & 63 | 128); t += String.fromCharCode(r & 63 | 128)}}return t}, _utf8_decode:function(e){var t = ""; var n = 0; var r = c1 = c2 = 0; while (n < e.length){r = e.charCodeAt(n); if (r < 128){t += String.fromCharCode(r); n++} else if (r > 191 && r < 224){c2 = e.charCodeAt(n + 1); t += String.fromCharCode((r & 31) << 6 | c2 & 63); n += 2} else{c2 = e.charCodeAt(n + 1); c3 = e.charCodeAt(n + 2); t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63); n += 3}}return t}};