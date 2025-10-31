(function(window,document,undefined){if(L.Canvas){L.Canvas.include({_fillStroke:function(ctx,layer){var options=layer.options
if(options.fill){ctx.globalAlpha=options.fillOpacity
ctx.fillStyle=options.fillColor||options.color
ctx.fill(options.fillRule||'evenodd')}
if(options.stroke&&options.weight!==0){if(ctx.setLineDash){ctx.setLineDash(layer.options&&layer.options._dashArray||[])}
ctx.globalAlpha=options.opacity
ctx.lineWidth=options.weight
ctx.strokeStyle=options.color
ctx.lineCap=options.lineCap
ctx.lineJoin=options.lineJoin
ctx.stroke()
if(options.imgId){var img=document.getElementById(options.imgId)
ctx.save()
ctx.clip()
var bounds=layer._rawPxBounds
var size=bounds.getSize()
var pattern=ctx.createPattern(img,'repeat')
ctx.fillStyle=pattern
ctx.fillRect(bounds.min.x,bounds.min.y,size.x,size.y)
ctx.restore()}}}})}}(this,document));(function(){L.Control.LinearMeasurement=L.Control.extend({options:{position:'topleft',unitSystem:'imperial',color:'#4D90FE',contrastingColor:'#fff',show_last_node:false,show_azimut:false},clickSpeed:200,onAdd:function(map){var container=L.DomUtil.create('div','leaflet-control leaflet-bar'),link=L.DomUtil.create('a','icon-ruler',container),map_container=map.getContainer(),me=this;link.href='#';link.title='Toggle measurement tool';L.DomEvent.on(link,'click',L.DomEvent.stop).on(link,'click',function(){if(L.DomUtil.hasClass(link,'icon-active')){me.resetRuler(!!me.mainLayer);L.DomUtil.removeClass(link,'icon-active');L.DomUtil.removeClass(map_container,'ruler-map');}else{me.initRuler();L.DomUtil.addClass(link,'icon-active');L.DomUtil.addClass(map_container,'ruler-map');}});function contrastingColor(color){return(luma(color)>=165)?'000':'fff';}
function luma(color){var rgb=(typeof color==='string')?hexToRGBArray(color):color;return(0.2126*rgb[0])+(0.7152*rgb[1])+(0.0722*rgb[2]);}
function hexToRGBArray(color){if(color.length===3)
color=color.charAt(0)+color.charAt(0)+color.charAt(1)+color.charAt(1)+color.charAt(2)+color.charAt(2);else if(color.length!==6)
throw('Invalid hex color: '+color);var rgb=[];for(var i=0;i<=2;i++)
rgb[i]=parseInt(color.substr(i*2,2),16);return rgb;}
if(this.options.color&&this.options.color.indexOf('#')===-1){this.options.color='#'+this.options.color;}else if(!this.options.color){this.options.color='#4D90FE';}
var originalColor=this.options.color.replace('#','');this.options.contrastingColor='#'+contrastingColor(originalColor);return container;},onRemove:function(map){this.resetRuler(!!this.mainLayer);},initRuler:function(){var me=this,map=this._map;this.mainLayer=L.featureGroup();this.mainLayer.addTo(this._map);map.touchZoom.disable();map.doubleClickZoom.disable();map.boxZoom.disable();map.keyboard.disable();if(map.tap){map.tap.disable();}
this.dblClickEventFn=function(e){L.DomEvent.stop(e);};this.keyDownFn=function(e){if((e.originalEvent.ctrlKey||e.originalEvent.metaKey)&&e.originalEvent.key.toLowerCase()==='x'){if(this.layer){this.layer.off('click');this.layer.off('keydown');this.mainLayer.removeLayer(this.layer);L.DomEvent.stop(e);this.resetRuler(false);}}}
this.clickEventFn=function(e){if(me.clickHandle){clearTimeout(me.clickHandle);me.clickHandle=0;if(me.options.show_last_node){me.preClick(e);me.getMouseClickHandler(e);}
me.getDblClickHandler(e);}else{me.preClick(e);me.clickHandle=setTimeout(function(){me.getMouseClickHandler(e);me.clickHandle=0;},me.clickSpeed);}};this.moveEventFn=function(e){if(!me.clickHandle){me.getMouseMoveHandler(e);}};map.on('click',this.clickEventFn,this);map.on('mousemove',this.moveEventFn,this);map.on('keydown',this.keyDownFn,this);this.resetRuler();},initLayer:function(){this.layer=L.featureGroup();this.layer.addTo(this.mainLayer);this.layer.on('selected',this.layerSelected);this.layer.on('click',this.clickEventFn,this);},resetRuler:function(resetLayer){var map=this._map;if(resetLayer){map.off('click',this.clickEventFn,this);map.off('mousemove',this.moveEventFn,this);if(this.mainLayer){this._map.removeLayer(this.mainLayer);}
this.mainLayer=null;this._map.touchZoom.enable();this._map.boxZoom.enable();this._map.keyboard.enable();if(this._map.tap){this._map.tap.enable();}}
this.layer=null;this.prevLatlng=null;this.poly=null;this.multi=null;this.latlngs=null;this.latlngsList=[];this.sum=0;this.distance=0;this.separation=1;this.last=0;this.fixedLast=0;this.totalIcon=null;this.total=null;this.lastCircle=null;this.UNIT_CONV=1000;this.SUB_UNIT_CONV=1000;this.UNIT='km';this.SUB_UNIT='m';if(this.options.unitSystem==='imperial'){this.UNIT_CONV=1609.344;this.SUB_UNIT_CONV=5280;this.UNIT='mi';this.SUB_UNIT='ft';}
this.measure={scalar:0,unit:this.SUB_UNIT};},cleanUpMarkers:function(fixed){var layer=this.layer;if(layer){layer.eachLayer(function(l){if(l.options&&l.options.type==='tmp'){if(fixed){l.options.type='fixed';}else{layer.removeLayer(l);}}});}},cleanUpFixed:function(){var layer=this.layer;if(layer){layer.eachLayer(function(l){if(l.options&&(l.options.type==='fixed')){layer.removeLayer(l);}});}},convertDots:function(){var me=this,layer=this.layer;if(layer){layer.eachLayer(function(l){if(l.options&&(l.options.type==='dot')){var m=l.options.marker,i=m?m.options.icon.options:null,il=i?i.html:'';if(il&&il.indexOf(me.measure.unit)===-1){var str=l.options.label,s=str.split(' '),e=parseFloat(s[0]),u=s[1],label='';if(l.options.label.indexOf(me.measure.unit)!==-1){label=l.options.label;}else if(u===me.UNIT){label=(e*me.SUB_UNIT_CONV).toFixed(2)+' '+me.SUB_UNIT;}else if(u===me.SUB_UNIT){label=(e/me.SUB_UNIT_CONV).toFixed(2)+' '+me.UNIT;}
var cicon=L.divIcon({className:'total-popup-label',html:label});m.setIcon(cicon);}}});}},displayMarkers:function(latlngs,multi,sum){var x,y,label,ratio,p,latlng=latlngs[latlngs.length-1],prevLatlng=latlngs[0],original=prevLatlng.distanceTo(latlng)/this.UNIT_CONV,dis=original;var p2=this._map.latLngToContainerPoint(latlng),p1=this._map.latLngToContainerPoint(prevLatlng),unit=1;if(this.measure.unit===this.SUB_UNIT){unit=this.SUB_UNIT_CONV;dis=dis*unit;}
var t=(sum*unit)+dis,qu=sum*unit;for(var q=Math.floor(qu);q<t;q++){ratio=(t-q)/dis;if(q%this.separation||q<qu){continue;}
x=(p2.x-ratio*(p2.x-p1.x));y=(p2.y-ratio*(p2.y-p1.y));p=L.point(x,y);latlng=this._map.containerPointToLatLng(p);label=(q+' '+this.measure.unit);this.renderCircle(latlng,0,this.layer,multi?'fixed':'tmp',label);this.last=t;}
return original;},renderCircle:function(latLng,radius,layer,type,label){var color=this.options.color,lineColor=this.options.color,azimut='',nodeCls='';type=type||'circle';var linesHTML=[];var options={color:lineColor,fillOpacity:1,opacity:1,fill:true,type:type};var a=this.prevLatlng?this._map.latLngToContainerPoint(this.prevLatlng):null,b=this._map.latLngToContainerPoint(latLng);if(type==='dot'){nodeCls='node-label';if(a&&this.options.show_azimut){azimut=' <span class="azimut"> '+this.lastAzimut+'&deg;</span>';}}
var p_latLng=this._map.containerPointToLatLng(b);if(label){var cicon=L.divIcon({className:'total-popup-label '+nodeCls,html:'<span style="color: '+color+';">'+label+azimut+'</span>'});options.icon=cicon;options.marker=L.marker(p_latLng,{icon:cicon,type:type}).addTo(layer);options.label=label;}
var circle=L.circleMarker(latLng,options);circle.setRadius(3);circle.addTo(layer);return circle;},getAzimut:function(a,b){var deg=0;if(a&&b){deg=parseInt(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI);if(deg>0){deg+=90;}else if(deg<0){deg=Math.abs(deg);if(deg<=90){deg=90-deg;}else{deg=360-(deg-90);}}}
this.lastAzimut=deg;return deg;},renderPolyline:function(latLngs,dashArray,layer){var poly=L.polyline(latLngs,{color:this.options.color,weight:2,opacity:1,dashArray:dashArray});poly.addTo(layer);return poly;},renderMultiPolyline:function(latLngs,dashArray,layer){var multi;if(L.version.startsWith('0')){multi=L.multiPolyline(latLngs,{color:this.options.color,weight:2,opacity:1,dashArray:dashArray});}else{multi=L.polyline(latLngs,{color:this.options.color,weight:2,opacity:1,dashArray:dashArray});}
multi.addTo(layer);return multi;},formatDistance:function(distance,precision){var s=L.Util.formatNum((distance<1?distance*parseFloat(this.SUB_UNIT_CONV):distance),precision),u=(distance<1?this.SUB_UNIT:this.UNIT);return{scalar:s,unit:u};},hasClass:function(target,classes){var fn=L.DomUtil.hasClass;for(var i in classes){if(fn(target,classes[i])){return true;}}
return false;},preClick:function(e){var me=this,target=e.originalEvent.target;if(this.hasClass(target,['leaflet-popup','total-popup-content'])){return;}
if(!me.layer){me.initLayer();}
me.cleanUpMarkers(true);me.fixedLast=me.last;me.prevLatlng=e.latlng;me.sum=0;},getMouseClickHandler:function(e){var me=this;me.fixedLast=me.last;me.sum=0;if(me.poly){me.latlngsList.push(me.latlngs);if(!me.multi){me.multi=me.renderMultiPolyline(me.latlngsList,'5 5',me.layer,'dot');}else{me.multi.setLatLngs(me.latlngsList);}}
var o,dis;for(var l in me.latlngsList){o=me.latlngsList[l];me.sum+=o[0].distanceTo(o[1])/me.UNIT_CONV;}
if(me.measure.unit===this.SUB_UNIT){dis=me.sum*me.SUB_UNIT_CONV;}else{dis=me.sum;}
var s=dis.toFixed(2);me.renderCircle(e.latlng,0,me.layer,'dot',parseInt(s)?(s+' '+me.measure.unit):'');me.prevLatlng=e.latlng;},getMouseMoveHandler:function(e){var azimut='';if(this.prevLatlng){var latLng=e.latlng;this.latlngs=[this.prevLatlng,e.latlng];if(!this.poly){this.poly=this.renderPolyline(this.latlngs,'5 5',this.layer);}else{this.poly.setLatLngs(this.latlngs);}
this.distance=parseFloat(this.prevLatlng.distanceTo(e.latlng))/this.UNIT_CONV;this.measure=this.formatDistance(this.distance+this.sum,2);var a=this.prevLatlng?this._map.latLngToContainerPoint(this.prevLatlng):null,b=this._map.latLngToContainerPoint(latLng);if(a&&this.options.show_azimut){var style='color: '+this.options.contrastingColor+';';azimut=' <span class="azimut azimut-final" style="'+style+'"> &nbsp; '+this.getAzimut(a,b)+'&deg;</span>';}
var label=this.measure.scalar+' '+this.measure.unit,html='<span class="total-popup-content" style="background-color:'+this.options.color+'; color: '+this.options.contrastingColor+'">'+label+azimut+'</span>';if(!this.total){this.totalIcon=L.divIcon({className:'total-popup',html:html});this.total=L.marker(e.latlng,{icon:this.totalIcon,clickable:true}).addTo(this.layer);}else{this.totalIcon=L.divIcon({className:'total-popup',html:html});this.total.setLatLng(e.latlng);this.total.setIcon(this.totalIcon);}
var ds=this.measure.scalar,old_separation=this.separation,digits=parseInt(ds).toString().length,num=Math.pow(10,digits),real=ds>(num/2)?(num/10):(num/20),dimension=0;this.separation=real;if(old_separation!==this.separation&&this.fixedLast){this.cleanUpMarkers();this.cleanUpFixed();var multi_latlngs=this.multi.getLatLngs();for(var s in multi_latlngs){dimension+=this.displayMarkers.apply(this,[multi_latlngs[s],true,dimension]);}
this.displayMarkers.apply(this,[this.poly.getLatLngs(),false,this.sum]);this.convertDots();}else{this.cleanUpMarkers();this.displayMarkers.apply(this,[this.poly.getLatLngs(),false,this.sum]);}}},getDblClickHandler:function(e){var azimut='',me=this;if(!this.total){return;}
this.layer.off('click');this.layer.off('keydown');L.DomEvent.stop(e);if(this.options.show_azimut){var style='color: '+this.options.contrastingColor+';';azimut=' <span class="azimut azimut-final" style="'+style+'"> &nbsp; '+this.lastAzimut+'&deg;</span>';}
var workspace=this.layer,label=this.measure.scalar+' '+this.measure.unit+' ',total_scalar=this.measure.unit===this.SUB_UNIT?this.measure.scalar/this.UNIT_CONV:this.measure.scalar,total_latlng=this.total.getLatLng(),total_label=this.total,html=['<div class="total-popup-content" style="background-color:'+this.options.color+'; color: '+this.options.contrastingColor+'">'+label+azimut,'  <svg class="close" viewbox="0 0 45 35">','   <path style="stroke: '+this.options.contrastingColor+'" class="close" d="M 10,10 L 30,30 M 30,10 L 10,30" />','  </svg>','</div>'].join('');this.totalIcon=L.divIcon({className:'total-popup',html:html});this.total.setIcon(this.totalIcon);var data={total:this.measure,total_label:total_label,unit:this.UNIT_CONV,sub_unit:this.SUB_UNIT_CONV};var fireSelected=function(e){if(L.DomUtil.hasClass(e.originalEvent.target,'close')){me.mainLayer.removeLayer(workspace);}else{workspace.fireEvent('selected',data);}};workspace.on('click',fireSelected);workspace.fireEvent('selected',data);this.resetRuler(false);},purgeLayers:function(layers){for(var i in layers){if(layers[i]){this.layer.removeLayer(layers[i]);}}},layerSelected:function(e){}});})();;!function(e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).osmtogeojson=e()}(function(){return function r(o,i,a){function u(t,e){if(!i[t]){if(!o[t]){var n="function"==typeof require&&require;if(!e&&n)return n(t,!0);if(s)return s(t,!0);throw(e=new Error("Cannot find module '"+t+"'")).code="MODULE_NOT_FOUND",e}n=i[t]={exports:{}},o[t][0].call(n.exports,function(e){return u(o[t][1][e]||e)},n,n.exports,r,o,i,a)}return i[t].exports}for(var s="function"==typeof require&&require,e=0;e<a.length;e++)u(a[e]);return u}({1:[function(e,t,n){var F=e("./lodash.custom.js"),L=e("@mapbox/geojson-rewind"),r={};function o(e,t){return(e.version||t.version)&&e.version!==t.version?(+e.version||0)>(+t.version||0)?e:t:F.merge(e,t)}e("osm-polygon-features").forEach(function(e){var t,n;"all"===e.polygon?r[e.key]=!0:(t="whitelist"===e.polygon?"included_values":"excluded_values",n={},e.values.forEach(function(e){n[e]=!0}),r[e.key]={},r[e.key][t]=n)});function P(e){function t(e){return e[e.length-1]}function n(e,t){return void 0!==e&&void 0!==t&&e.id===t.id}for(var r,o,i,a,u,s,l=[];e.length;)for(r=e.pop().nodes.slice(),l.push(r);e.length&&!n(r[0],t(r));){for(o=r[0],i=t(r),a=0;a<e.length;a++){if(n(i,(s=e[a].nodes)[0])){u=r.push,s=s.slice(1);break}if(n(i,t(s))){u=r.push,s=s.slice(0,-1).reverse();break}if(n(o,t(s))){u=r.unshift,s=s.slice(0,-1);break}if(n(o,s[0])){u=r.unshift,s=s.slice(1).reverse();break}s=u=null}if(!s)break;e.splice(a,1),u.apply(r,s)}return l}t.exports=(e=function(e,N,S){var t,a,u,s,l,c;function f(e,t,n){e.hasAttribute(n)&&(t[n]=e.getAttribute(n))}function p(e,t){e=F.clone(e);f(t,e,"lat"),f(t,e,"lon"),e.__is_center_placeholder=!0,s.push(e)}function y(e,t){var r=F.clone(e);function n(e,t,n){n={type:"node",id:"_"+r.type+"/"+r.id+"bounds"+n,lat:e,lon:t};r.nodes.push(n.id),s.push(n)}r.nodes=[],n(t.getAttribute("minlat"),t.getAttribute("minlon"),1),n(t.getAttribute("maxlat"),t.getAttribute("minlon"),2),n(t.getAttribute("maxlat"),t.getAttribute("maxlon"),3),n(t.getAttribute("minlat"),t.getAttribute("maxlon"),4),r.nodes.push(r.nodes[0]),r.__is_bounds_placeholder=!0,l.push(r)}function d(r,e){F.isArray(r.nodes)||(r.nodes=[],F.each(e,function(e,t){r.nodes.push("_anonymous@"+e.getAttribute("lat")+"/"+e.getAttribute("lon"))})),F.each(e,function(e,t){var n;e.getAttribute("lat")&&(n=e.getAttribute("lat"),e=e.getAttribute("lon"),t={type:"node",id:t=r.nodes[t],lat:n,lon:e},s.push(t))})}function g(i,e){function a(e,t){var n;l.some(function(e){return"way"==e.type&&e.id==t})||(n={type:"way",id:t,nodes:[]},F.each(e,function(e){var t;e.getAttribute("lat")?(t=e.getAttribute("lat"),e=e.getAttribute("lon"),t={type:"node",id:"_anonymous@"+t+"/"+e,lat:t,lon:e},n.nodes.push(t.id),s.push(t)):n.nodes.push(void 0)}),l.push(n))}F.each(e,function(e,t){var n,r,o;"node"==i.members[t].type?e.getAttribute("lat")&&(n=e.getAttribute("lat"),r=e.getAttribute("lon"),o=i.members[t].ref,s.push({type:"node",id:o,lat:n,lon:r})):"way"==i.members[t].type&&0<e.getElementsByTagName("nd").length&&(i.members[t].ref="_fullGeom"+i.members[t].ref,a(e.getElementsByTagName("nd"),i.members[t].ref))})}return N=F.merge({verbose:!1,flatProperties:!0,uninterestingTags:{source:!0,source_ref:!0,"source:ref":!0,history:!0,attribution:!0,created_by:!0,"tiger:county":!0,"tiger:tlid":!0,"tiger:upload_uuid":!0},polygonFeatures:r,deduplicator:o},N),"undefined"!=typeof XMLDocument&&e instanceof XMLDocument||"undefined"==typeof XMLDocument&&e.childNodes?(t=e,s=new Array,l=new Array,c=new Array,F.each(t.getElementsByTagName("node"),function(e,t){var n={},r=(F.each(e.getElementsByTagName("tag"),function(e){n[e.getAttribute("k")]=e.getAttribute("v")}),{type:"node"});f(e,r,"id"),f(e,r,"lat"),f(e,r,"lon"),f(e,r,"version"),f(e,r,"timestamp"),f(e,r,"changeset"),f(e,r,"uid"),f(e,r,"user"),F.isEmpty(n)||(r.tags=n),s.push(r)}),F.each(t.getElementsByTagName("way"),function(e,t){var n={},r=[],o=(F.each(e.getElementsByTagName("tag"),function(e){n[e.getAttribute("k")]=e.getAttribute("v")}),!1),i=(F.each(e.getElementsByTagName("nd"),function(e,t){var n;(n=e.getAttribute("ref"))&&(r[t]=n),!o&&e.getAttribute("lat")&&(o=!0)}),{type:"way"});f(e,i,"id"),f(e,i,"version"),f(e,i,"timestamp"),f(e,i,"changeset"),f(e,i,"uid"),f(e,i,"user"),0<r.length&&(i.nodes=r),F.isEmpty(n)||(i.tags=n),(a=e.getElementsByTagName("center")[0])&&p(i,a),o?d(i,e.getElementsByTagName("nd")):(u=e.getElementsByTagName("bounds")[0])&&y(i,u),l.push(i)}),F.each(t.getElementsByTagName("relation"),function(e,t){var n={},r=[],o=(F.each(e.getElementsByTagName("tag"),function(e){n[e.getAttribute("k")]=e.getAttribute("v")}),!1),i=(F.each(e.getElementsByTagName("member"),function(e,t){r[t]={},f(e,r[t],"ref"),f(e,r[t],"role"),f(e,r[t],"type"),(!o&&"node"==r[t].type&&e.getAttribute("lat")||"way"==r[t].type&&0<e.getElementsByTagName("nd").length)&&(o=!0)}),{type:"relation"});f(e,i,"id"),f(e,i,"version"),f(e,i,"timestamp"),f(e,i,"changeset"),f(e,i,"uid"),f(e,i,"user"),0<r.length&&(i.members=r),F.isEmpty(n)||(i.tags=n),(a=e.getElementsByTagName("center")[0])&&p(i,a),o?g(i,e.getElementsByTagName("member")):(u=e.getElementsByTagName("bounds")[0])&&y(i,u),c.push(i)}),h(s,l,c)):function(e){var a=new Array,o=new Array,t=new Array;function n(e){var t=F.clone(e);t.lat=e.center.lat,t.lon=e.center.lon,t.__is_center_placeholder=!0,a.push(t)}function r(e){var r=F.clone(e);function t(e,t,n){n={type:"node",id:"_"+r.type+"/"+r.id+"bounds"+n,lat:e,lon:t};r.nodes.push(n.id),a.push(n)}r.nodes=[],t(r.bounds.minlat,r.bounds.minlon,1),t(r.bounds.maxlat,r.bounds.minlon,2),t(r.bounds.maxlat,r.bounds.maxlon,3),t(r.bounds.minlat,r.bounds.maxlon,4),r.nodes.push(r.nodes[0]),r.__is_bounds_placeholder=!0,o.push(r)}function i(r){F.isArray(r.nodes)||(r.nodes=r.geometry.map(function(e){return null!==e?"_anonymous@"+e.lat+"/"+e.lon:"_anonymous@unknown_location"})),r.geometry.forEach(function(e,t){var n;e&&(n=e.lat,e=e.lon,t=r.nodes[t],a.push({type:"node",id:t,lat:n,lon:e}))})}function u(e){function i(e,t){var n;o.some(function(e){return"way"==e.type&&e.id==t})||(n={type:"way",id:t,nodes:[]},e.forEach(function(e){var t;e?(t=e.lat,e=e.lon,t={type:"node",id:"_anonymous@"+t+"/"+e,lat:t,lon:e},n.nodes.push(t.id),a.push(t)):n.nodes.push(void 0)}),o.push(n))}e.members.forEach(function(e,t){var n,r,o;"node"==e.type?e.lat&&(n=e.lat,r=e.lon,o=e.ref,a.push({type:"node",id:o,lat:n,lon:r})):"way"==e.type&&e.geometry&&(e.ref="_fullGeom"+e.ref,i(e.geometry,e.ref))})}for(var s=0;s<e.elements.length;s++)switch(e.elements[s].type){case"node":var l=e.elements[s];a.push(l);break;case"way":l=F.clone(e.elements[s]);l.nodes=F.clone(l.nodes),o.push(l),l.center&&n(l),l.geometry?i(l):l.bounds&&r(l);break;case"relation":var c=F.clone(e.elements[s]),f=(c.members=F.clone(c.members),t.push(c),c.members&&c.members.some(function(e){return"node"==e.type&&e.lat||"way"==e.type&&e.geometry&&0<e.geometry.length}));c.center&&n(c),f?u(c):c.bounds&&r(c)}return h(a,o,t)}(e);function h(e,t,n){function r(e,t){if("object"!=typeof t&&(t={}),"function"==typeof N.uninterestingTags)return!N.uninterestingTags(e,t);for(var n in e)if(!0!==N.uninterestingTags[n]&&!0!==t[n]&&t[n]!==e[n])return 1}function p(e){var t,n={timestamp:e.timestamp,version:e.version,changeset:e.changeset,user:e.user,uid:e.uid};for(t in n)void 0===n[t]&&delete n[t];return n}for(var o=new Object,i=new Object,a=0;a<e.length;a++)void 0!==(o[(f=void 0!==o[(f=e[a]).id]?N.deduplicator(f,o[f.id]):f).id]=f).tags&&r(f.tags)&&(i[f.id]=!0);for(a=0;a<n.length;a++)if(F.isArray(n[a].members))for(var u=0;u<n[a].members.length;u++)"node"==n[a].members[u].type&&(i[n[a].members[u].ref]=!0);for(var y=new Object,s=new Object,a=0;a<t.length;a++){var l=t[a];if(y[l.id]&&(l=N.deduplicator(l,y[l.id])),y[l.id]=l,F.isArray(l.nodes))for(u=0;u<l.nodes.length;u++)"object"!=typeof l.nodes[u]&&(s[l.nodes[u]]=!0,l.nodes[u]=o[l.nodes[u]])}var c=new Array;for(g in o){var f=o[g];s[g]&&!i[g]||c.push(f)}for(var d=new Array,a=0;a<n.length;a++)d[(m=d[(m=n[a]).id]?N.deduplicator(m,d[m.id]):m).id]=m;var g,h,b={node:{},way:{},relation:{}};for(g in d){var m=d[g];if(F.isArray(m.members))for(u=0;u<m.members.length;u++){var v=m.members[u].type,_=m.members[u].ref;"number"!=typeof _&&(_=_.replace("_fullGeom","")),b[v]?(void 0===b[v][_]&&(b[v][_]=[]),b[v][_].push({role:m.members[u].role,rel:m.id,reltags:m.tags})):N.verbose&&console.warn("Relation",m.type+"/"+m.id,"member",v+"/"+_,"ignored because it has an invalid type")}else N.verbose&&console.warn("Relation",m.type+"/"+m.id,"ignored because it has no members")}var w=[];for(a=0;a<c.length;a++)void 0===c[a].lon||void 0===c[a].lat?N.verbose&&console.warn("POI",c[a].type+"/"+c[a].id,"ignored because it lacks coordinates"):(E={type:"Feature",id:c[a].type+"/"+c[a].id,properties:{type:c[a].type,id:c[a].id,tags:c[a].tags||{},relations:b.node[c[a].id]||[],meta:p(c[a])},geometry:{type:"Point",coordinates:[+c[a].lon,+c[a].lat]}},c[a].__is_center_placeholder&&(E.properties.geometry="center"),S?S(E):w.push(E));for(var j=[],A=[],a=0;a<n.length;a++)if(d[n[a].id]===n[a]){if(void 0!==n[a].tags&&("route"==n[a].tags.type||"waterway"==n[a].tags.type)){if(!F.isArray(n[a].members)){N.verbose&&console.warn("Route",n[a].type+"/"+n[a].id,"ignored because it has no members");continue}if(n[a].members.forEach(function(e){y[e.ref]&&!r(y[e.ref].tags)&&(y[e.ref].is_skippablerelationmember=!0)}),!1===(E=function(n){var r=!1,e=(t=(t=n.members.filter(function(e){return"way"===e.type})).map(function(t){var e=y[t.ref];if(void 0!==e&&void 0!==e.nodes)return{id:t.ref,role:t.role,way:e,nodes:e.nodes.filter(function(e){return void 0!==e||(r=!0,N.verbose&&console.warn("Route",n.type+"/"+n.id,"tainted by a way",t.type+"/"+t.ref,"with a missing node"),!1)})};N.verbose&&console.warn("Route "+n.type+"/"+n.id,"tainted by a missing or incomplete  way",t.type+"/"+t.ref),r=!0}),t=F.compact(t),t=P(t),[]);if(0==(e=F.compact(t.map(function(e){return F.compact(e.map(function(e){return[+e.lon,+e.lat]}))}))).length)return N.verbose&&console.warn("Route",n.type+"/"+n.id,"contains no coordinates"),!1;var t={type:"Feature",id:n.type+"/"+n.id,properties:{type:n.type,id:n.id,tags:n.tags||{},relations:b[n.type][n.id]||[],meta:p(n)},geometry:{type:1===e.length?"LineString":"MultiLineString",coordinates:1===e.length?e[0]:e}};r&&(N.verbose&&console.warn("Route",n.type+"/"+n.id,"is tainted"),t.properties.tainted=!0);return t}(n[a]))){N.verbose&&console.warn("Route relation",n[a].type+"/"+n[a].id,"ignored because it has invalid geometry");continue}S?S(L(E)):A.push(E)}if(void 0!==n[a].tags&&("multipolygon"==n[a].tags.type||"boundary"==n[a].tags.type)){if(F.isArray(n[a].members)){for(var k=0,u=0;u<n[a].members.length;u++)"outer"==n[a].members[u].role?k++:N.verbose&&"inner"!=n[a].members[u].role&&console.warn("Multipolygon",n[a].type+"/"+n[a].id,"member",n[a].members[u].type+"/"+n[a].members[u].ref,'ignored because it has an invalid role: "'+n[a].members[u].role+'"');if(n[a].members.forEach(function(e){y[e.ref]&&("outer"!==e.role||r(y[e.ref].tags,n[a].tags)||(y[e.ref].is_skippablerelationmember=!0),"inner"!==e.role||r(y[e.ref].tags)||(y[e.ref].is_skippablerelationmember=!0))}),0==k)N.verbose&&console.warn("Multipolygon relation",n[a].type+"/"+n[a].id,"ignored because it has no outer ways");else{var O=!1,E=null;if(O=1!=k||r(n[a].tags,{type:!0})?O:!0){var x=n[a].members.filter(function(e){return"outer"===e.role})[0];if(void 0===(x=y[x.ref])){N.verbose&&console.warn("Multipolygon relation",n[a].type+"/"+n[a].id,"ignored because outer way",x.type+"/"+x.ref,"is missing");continue}x.is_skippablerelationmember=!0,E=T(x,n[a])}else E=T(n[a],n[a]);!1===E?N.verbose&&console.warn("Multipolygon relation",n[a].type+"/"+n[a].id,"ignored because it has invalid geometry"):S?S(L(E)):A.push(E)}}else N.verbose&&console.warn("Multipolygon",n[a].type+"/"+n[a].id,"ignored because it has no members");function T(e,t){var n=!1,r=O?"way":"relation",o="number"==typeof e.id?e.id:+e.id.replace("_fullGeom","");function i(e){function t(e){return e.map(function(e){return[+e.lat,+e.lon]})}var n;for(e=t(e),n=0;n<a.length;n++)if(function(e,t){for(var n=0;n<t.length;n++)if(function(e,t){for(var n=e[0],r=e[1],o=false,i=0,a=t.length-1;i<t.length;a=i++){var u=t[i][0],s=t[i][1];var l=t[a][0],c=t[a][1];var f=s>r!=c>r&&n<(l-u)*(r-s)/(c-s)+u;if(f)o=!o}return o}(t[n],e))return!0;return!1}(t(a[n]),e))return n}t=(t=t.members.filter(function(e){return"way"===e.type})).map(function(t){var e=y[t.ref];if(void 0!==e&&void 0!==e.nodes)return{id:t.ref,role:t.role||"outer",way:e,nodes:e.nodes.filter(function(e){return void 0!==e||(n=!0,N.verbose&&console.warn("Multipolygon",r+"/"+o,"tainted by a way",t.type+"/"+t.ref,"with a missing node"),!1)})};N.verbose&&console.warn("Multipolygon",r+"/"+o,"tainted by a missing or incomplete way",t.type+"/"+t.ref),n=!0});for(var a=P((t=F.compact(t)).filter(function(e){return"outer"===e.role})),u=P(t.filter(function(e){return"inner"===e.role})),s=a.map(function(e){return[e]}),l=0;l<u.length;l++){var c=i(u[l]);void 0!==c?s[c].push(u[l]):N.verbose&&console.warn("Multipolygon",r+"/"+o,"contains an inner ring with no containing outer")}var f,t=[];return 0==(t=F.compact(s.map(function(e){e=F.compact(e.map(function(e){if(!(e.length<4))return F.compact(e.map(function(e){return[+e.lon,+e.lat]}));N.verbose&&console.warn("Multipolygon",r+"/"+o,"contains a ring with less than four nodes")}));if(0!=e.length)return e;N.verbose&&console.warn("Multipolygon",r+"/"+o,"contains an empty ring cluster")}))).length?(N.verbose&&console.warn("Multipolygon",r+"/"+o,"contains no coordinates"),!1):(f="MultiPolygon",1===t.length&&(f="Polygon",t=t[0]),e={type:"Feature",id:e.type+"/"+o,properties:{type:e.type,id:o,tags:e.tags||{},relations:b[e.type][e.id]||[],meta:p(e)},geometry:{type:f,coordinates:t}},n&&(N.verbose&&console.warn("Multipolygon",r+"/"+o,"is tainted"),e.properties.tainted=!0),e)}}}for(a=0;a<t.length;a++)if(y[t[a].id]===t[a])if(F.isArray(t[a].nodes)){if(!t[a].is_skippablerelationmember){"number"!=typeof t[a].id&&(t[a].id=+t[a].id.replace("_fullGeom","")),t[a].tainted=!1,t[a].hidden=!1;var M,B=new Array;for(u=0;u<t[a].nodes.length;u++)"object"==typeof t[a].nodes[u]?B.push([+t[a].nodes[u].lon,+t[a].nodes[u].lat]):(N.verbose&&console.warn("Way",t[a].type+"/"+t[a].id,"is tainted by an invalid node"),t[a].tainted=!0);B.length<=1?N.verbose&&console.warn("Way",t[a].type+"/"+t[a].id,"ignored because it contains too few nodes"):(M="LineString",void 0!==t[a].nodes[0]&&void 0!==t[a].nodes[t[a].nodes.length-1]&&t[a].nodes[0].id===t[a].nodes[t[a].nodes.length-1].id&&(void 0!==t[a].tags&&function(e){var t=N.polygonFeatures;if("function"==typeof t)return t(e);if("no"!==e.area)for(var n in e){var r=e[n],n=t[n];if(void 0!==n&&"no"!==r){if(!0===n)return 1;if(n.included_values&&!0===n.included_values[r])return 1;if(n.excluded_values&&!0!==n.excluded_values[r])return 1}}return}(t[a].tags)||t[a].__is_bounds_placeholder)&&(M="Polygon",B=[B]),E={type:"Feature",id:t[a].type+"/"+t[a].id,properties:{type:t[a].type,id:t[a].id,tags:t[a].tags||{},relations:b.way[t[a].id]||[],meta:p(t[a])},geometry:{type:M,coordinates:B}},t[a].tainted&&(N.verbose&&console.warn("Way",t[a].type+"/"+t[a].id,"is tainted"),E.properties.tainted=!0),t[a].__is_bounds_placeholder&&(E.properties.geometry="bounds"),S?S(L(E)):("LineString"==M?j:A).push(E))}}else N.verbose&&console.warn("Way",t[a].type+"/"+t[a].id,"ignored because it has no nodes");return!!S||((h={type:"FeatureCollection",features:[]}).features=h.features.concat(A),h.features=h.features.concat(j),h.features=h.features.concat(w),N.flatProperties&&h.features.forEach(function(e){e.properties=F.merge(e.properties.meta,e.properties.tags,{id:e.properties.type+"/"+e.properties.id})}),L(h))}}).toGeojson=e},{"./lodash.custom.js":2,"@mapbox/geojson-rewind":3,"osm-polygon-features":4}],2:[function(e,Ht,Jt){!function(Xt){!function(){!function(){var R,h="__lodash_hash_undefined__",I=1,$=2,b=1/0,_=9007199254740991,C="[object Arguments]",ee="[object Array]",te="[object Boolean]",ne="[object Date]",re="[object Error]",w="[object Function]",j="[object GeneratorFunction]",D="[object Map]",oe="[object Number]",G="[object Object]",A="[object Promise]",ie="[object RegExp]",U="[object Set]",ae="[object String]",ue="[object Symbol]",k="[object WeakMap]",se="[object ArrayBuffer]",z="[object DataView]",O="[object Float32Array]",E="[object Float64Array]",x="[object Int8Array]",T="[object Int16Array]",M="[object Int32Array]",B="[object Uint8Array]",N="[object Uint8ClampedArray]",S="[object Uint16Array]",F="[object Uint32Array]",L=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,P=/^\w*$/,le=/^\./,ce=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,fe=/\\(\\)?/g,pe=/\w*$/,ye=/^\[object .+?Constructor\]$/,de=/^(?:0|[1-9]\d*)$/,t={},d=(t[O]=t[E]=t[x]=t[T]=t[M]=t[B]=t[N]=t[S]=t[F]=!0,t[C]=t[ee]=t[se]=t[te]=t[z]=t[ne]=t[re]=t[w]=t[D]=t[oe]=t[G]=t[ie]=t[U]=t[ae]=t[k]=!1,{}),e=(d[C]=d[ee]=d[se]=d[z]=d[te]=d[ne]=d[O]=d[E]=d[x]=d[T]=d[M]=d[D]=d[oe]=d[G]=d[ie]=d[U]=d[ae]=d[ue]=d[B]=d[N]=d[S]=d[F]=!0,d[re]=d[w]=d[k]=!1,"object"==typeof Xt&&Xt&&Xt.Object===Object&&Xt),n="object"==typeof self&&self&&self.Object===Object&&self,n=e||n||Function("return this")(),ge="object"==typeof Jt&&Jt&&!Jt.nodeType&&Jt,he=ge&&"object"==typeof Ht&&Ht&&!Ht.nodeType&&Ht,be=he&&he.exports===ge,me=be&&e.process,e=function(){try{return me&&me.binding("util")}catch(e){}}(),e=e&&e.isTypedArray;function ve(e,t){return e.set(t[0],t[1]),e}function _e(e,t){return e.add(t),e}function we(e,t){for(var n=-1,r=e?e.length:0;++n<r&&!1!==t(e[n],n,e););return e}function je(e,t,n,r){var o=-1,i=e?e.length:0;for(r&&i&&(n=e[++o]);++o<i;)n=t(n,e[o],o,e);return n}function W(e){var t=!1;if(null!=e&&"function"!=typeof e.toString)try{t=!!(e+"")}catch(e){}return t}function Ae(e){var n=-1,r=Array(e.size);return e.forEach(function(e,t){r[++n]=[t,e]}),r}function ke(t,n){return function(e){return t(n(e))}}function Oe(e){var t=-1,n=Array(e.size);return e.forEach(function(e){n[++t]=e}),n}var Ee=Array.prototype,r=Function.prototype,xe=Object.prototype,o=n["__core-js_shared__"],Te=(o=/[^.]+$/.exec(o&&o.keys&&o.keys.IE_PROTO||""))?"Symbol(src)_1."+o:"",Me=r.toString,q=xe.hasOwnProperty,Be=Me.call(Object),i=xe.toString,Ne=RegExp("^"+Me.call(q).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),o=be?n.Buffer:R,r=n.Symbol,Se=n.Uint8Array,Fe=ke(Object.getPrototypeOf,Object),Le=Object.create,Pe=xe.propertyIsEnumerable,Re=Ee.splice,be=Object.getOwnPropertySymbols,Ee=o?o.isBuffer:R,Ie=ke(Object.keys,Object),$e=Math.max,o=p(n,"DataView"),a=p(n,"Map"),Ce=p(n,"Promise"),De=p(n,"Set"),n=p(n,"WeakMap"),u=p(Object,"create"),Ge=!Pe.call({valueOf:1},"valueOf"),Ue=y(o),ze=y(a),We=y(Ce),qe=y(De),Ve=y(n),r=r?r.prototype:R,V=r?r.valueOf:R,Xe=r?r.toString:R;function s(){}function l(e){var t=-1,n=e?e.length:0;for(this.clear();++t<n;){var r=e[t];this.set(r[0],r[1])}}function c(e){var t=-1,n=e?e.length:0;for(this.clear();++t<n;){var r=e[t];this.set(r[0],r[1])}}function f(e){var t=-1,n=e?e.length:0;for(this.clear();++t<n;){var r=e[t];this.set(r[0],r[1])}}function He(e){var t=-1,n=e?e.length:0;for(this.__data__=new f;++t<n;)this.add(e[t])}function X(e){this.__data__=new c(e)}function Je(e,t){var n,r=K(e)||v(e)?function(e,t){for(var n=-1,r=Array(e);++n<e;)r[n]=t(n);return r}(e.length,String):[],o=r.length,i=!!o;for(n in e)!t&&!q.call(e,n)||i&&("length"==n||vt(n,o))||r.push(n);return r}function Ke(e,t,n){(n===R||J(e[t],n))&&("number"!=typeof t||n!==R||t in e)||(e[t]=n)}function Qe(e,t,n){var r=e[t];q.call(e,t)&&J(r,n)&&(n!==R||t in e)||(e[t]=n)}function Ye(e,t){for(var n=e.length;n--;)if(J(e[n][0],t))return n;return-1}function m(n,r,o,i,e,t,a){var u;if((u=i?t?i(n,e,t,a):i(n):u)===R){if(!Q(n))return n;e=K(n);if(e){if(u=function(e){var t=e.length,n=e.constructor(t);t&&"string"==typeof e[0]&&q.call(e,"index")&&(n.index=e.index,n.input=e.input);return n}(n),!r)return dt(n,u)}else{var s,l,c=H(n),f=c==w||c==j;if(Mt(n))return s=n,(l=r)?s.slice():(l=new s.constructor(s.length),s.copy(l),l);if(c==G||c==C||f&&!t){if(W(n))return t?n:{};if(u="function"!=typeof(s=f?{}:n).constructor||wt(s)?{}:function(e){return Q(e)?Le(e):{}}(Fe(s)),!r)return f=l=n,f=(y=u)&&gt(f,Z(f),y),gt(l,mt(l),f)}else{if(!d[c])return t?n:{};u=function(e,t,n,r){var o=e.constructor;switch(t){case se:return yt(e);case te:case ne:return new o(+e);case z:return function(e,t){t=t?yt(e.buffer):e.buffer;return new e.constructor(t,e.byteOffset,e.byteLength)}(e,r);case O:case E:case x:case T:case M:case B:case N:case S:case F:return function(e,t){t=t?yt(e.buffer):e.buffer;return new e.constructor(t,e.byteOffset,e.length)}(e,r);case D:return function(e,t,n){return je(t?n(Ae(e),!0):Ae(e),ve,new e.constructor)}(e,r,n);case oe:case ae:return new o(e);case ie:return function(e){var t=new e.constructor(e.source,pe.exec(e));return t.lastIndex=e.lastIndex,t}(e);case U:return function(e,t,n){return je(t?n(Oe(e),!0):Oe(e),_e,new e.constructor)}(e,r,n);case ue:return function(e){return V?Object(V.call(e)):{}}(e)}}(n,c,m,r)}}var p,y=(a=a||new X).get(n);if(y)return y;a.set(n,u),we((p=e?p:o?function(e,t,n){t=t(e);return K(e)?t:function(e,t){for(var n=-1,r=t.length,o=e.length;++n<r;)e[o+n]=t[n];return e}(t,n(e))}(n,Z,mt):Z(n))||n,function(e,t){p&&(e=n[t=e]),Qe(u,t,m(e,r,o,i,t,n,a))})}return u}l.prototype.clear=function(){this.__data__=u?u(null):{}},l.prototype.delete=function(e){return this.has(e)&&delete this.__data__[e]},l.prototype.get=function(e){var t,n=this.__data__;return u?(t=n[e])===h?R:t:q.call(n,e)?n[e]:R},l.prototype.has=function(e){var t=this.__data__;return u?t[e]!==R:q.call(t,e)},l.prototype.set=function(e,t){return this.__data__[e]=u&&t===R?h:t,this},c.prototype.clear=function(){this.__data__=[]},c.prototype.delete=function(e){var t=this.__data__;return!((e=Ye(t,e))<0)&&(e==t.length-1?t.pop():Re.call(t,e,1),!0)},c.prototype.get=function(e){var t=this.__data__;return(e=Ye(t,e))<0?R:t[e][1]},c.prototype.has=function(e){return-1<Ye(this.__data__,e)},c.prototype.set=function(e,t){var n=this.__data__,r=Ye(n,e);return r<0?n.push([e,t]):n[r][1]=t,this},f.prototype.clear=function(){this.__data__={hash:new l,map:new(a||c),string:new l}},f.prototype.delete=function(e){return bt(this,e).delete(e)},f.prototype.get=function(e){return bt(this,e).get(e)},f.prototype.has=function(e){return bt(this,e).has(e)},f.prototype.set=function(e,t){return bt(this,e).set(e,t),this},He.prototype.add=He.prototype.push=function(e){return this.__data__.set(e,h),this},He.prototype.has=function(e){return this.__data__.has(e)},X.prototype.clear=function(){this.__data__=new c},X.prototype.delete=function(e){return this.__data__.delete(e)},X.prototype.get=function(e){return this.__data__.get(e)},X.prototype.has=function(e){return this.__data__.has(e)},X.prototype.set=function(e,t){var n=this.__data__;if(n instanceof c){var r=n.__data__;if(!a||r.length<199)return r.push([e,t]),this;n=this.__data__=new f(r)}return n.set(e,t),this};function Ze(e,t){if(null!=e){if(!g(e))return et(e,t);for(var n=e.length,r=tt?n:-1,o=Object(e);(tt?r--:++r<n)&&!1!==t(o[r],r,o););}return e}et=function(e,t){return e&&rt(e,t,Z)};var et,tt,nt,rt=function(e,t,n){for(var r=-1,o=Object(e),i=n(e),a=i.length;a--;){var u=i[nt?a:++r];if(!1===t(o[u],u,o))break}return e};function ot(e,t){for(var n=0,r=(t=_t(t,e)?[t]:pt(t)).length;null!=e&&n<r;)e=e[Ot(t[n++])];return n&&n==r?e:R}function it(e,t){return null!=e&&t in Object(e)}function at(e,t,n,r,o){if(e===t)return!0;if(null==e||null==t||!Q(e)&&!Y(t))return e!=e&&t!=t;var i=at,a=K(e),u=K(t),s=ee,l=ee,u=(a||(s=(s=H(e))==C?G:s),u||(l=(l=H(t))==C?G:l),s==G&&!W(e)),c=l==G&&!W(t);if((l=s==l)&&!u){o=o||new X;if(a||Pt(e))return ht(e,t,i,n,r,o);else{var f=e;var p=t;var y=s;var d=i;var g=n;var h=r;var b=o;switch(y){case z:if(f.byteLength!=p.byteLength||f.byteOffset!=p.byteOffset)return!1;f=f.buffer,p=p.buffer;case se:return f.byteLength==p.byteLength&&d(new Se(f),new Se(p))?!0:!1;case te:case ne:case oe:return J(+f,+p);case re:return f.name==p.name&&f.message==p.message;case ie:case ae:return f==p+"";case D:var m=Ae;case U:var v=h&$;if(m=m||Oe,f.size!=p.size&&!v)return!1;v=b.get(f);if(v)return v==p;h|=I,b.set(f,p);v=ht(m(f),m(p),d,g,h,b);return b.delete(f),v;case ue:if(V)return V.call(f)==V.call(p)}return!1;return}}if(!(r&$)){var a=u&&q.call(e,"__wrapped__"),s=c&&q.call(t,"__wrapped__");if(a||s)return u=a?e.value():e,c=s?t.value():t,o=o||new X,i(u,c,n,r,o)}if(l){o=o||new X;var _=e,w=t,j=i,A=n,k=r,O=o,E=k&$,x=Z(_),T=x.length,a=Z(w).length;if(T!=a&&!E)return!1;for(var M=T;M--;){var B=x[M];if(!(E?B in w:q.call(w,B)))return!1}if((a=O.get(_))&&O.get(w))return a==w;for(var N=!0,S=(O.set(_,w),O.set(w,_),E);++M<T;){B=x[M];var F,L=_[B],P=w[B];if(!((F=A?E?A(P,L,B,w,_,O):A(L,P,B,_,w,O):F)===R?L===P||j(L,P,A,k,O):F)){N=!1;break}S=S||"constructor"==B}return N&&!S&&(a=_.constructor,s=w.constructor,a!=s&&"constructor"in _&&"constructor"in w&&!("function"==typeof a&&a instanceof a&&"function"==typeof s&&s instanceof s)&&(N=!1)),O.delete(_),O.delete(w),N}return!1}function ut(e){var t;return Q(e)&&(t=e,!(Te&&Te in t))&&(Bt(e)||W(e)?Ne:ye).test(y(e))}function st(e){if("function"==typeof e)return e;if(null==e)return Ut;if("object"==typeof e)if(K(e)){var n=e[0],r=e[1];return _t(n)&&jt(r)?At(Ot(n),r):function(e){var t=$t(e,n);return t===R&&t===r?Ct(e,n):at(r,t,R,I|$)}}else{var t=e,o=function(e){var t=Z(e),n=t.length;for(;n--;){var r=t[n],o=e[r];t[n]=[r,o,jt(o)]}return t}(t);return 1==o.length&&o[0][2]?At(o[0][0],o[0][1]):function(e){return e===t||function(e,t,n,r){var o=n.length,i=o,a=!r;if(null==e)return!i;for(e=Object(e);o--;){var u=n[o];if(a&&u[2]?u[1]!==e[u[0]]:!(u[0]in e))return!1}for(;++o<i;){var s=(u=n[o])[0],l=e[s],c=u[1];if(a&&u[2]){if(l===R&&!(s in e))return!1}else{var f,p=new X;if(!((f=r?r(l,c,s,e,t,p):f)===R?at(c,l,r,I|$,p):f))return!1}}return!0}(e,t,o)}}return Wt(e)}function lt(e){if(!Q(e)){var t=e,n=[];if(null!=t)for(var r in Object(t))n.push(r);return n}var o,i=wt(e),a=[];for(o in e)("constructor"!=o||!i&&q.call(e,o))&&a.push(o);return a}function ct(p,y,d,g,h){var b;p!==y&&we((b=K(y)||Pt(y)?b:lt(y))||y,function(e,t){var n,r,o,i,a,u,s,l,c,f;Q(e=b?y[t=e]:e)?(h=h||new X,r=y,i=d,a=ct,u=g,s=h,l=(n=p)[o=t],c=r[o],(f=s.get(c))?Ke(n,o,f):(f=u?u(l,c,o+"",n,r,s):R,(r=f===R)&&(K(f=c)||Pt(c)?f=K(l)?l:Tt(l)?dt(l):m(c,!(r=!1)):St(c)||v(c)?f=v(l)?Rt(l):!Q(l)||i&&Bt(l)?m(c,!(r=!1)):l:r=!1),r&&(s.set(c,f),a(f,c,i,u,s),s.delete(c)),Ke(n,o,f))):(l=g?g(p[t],e,t+"",p,y,h):R,Ke(p,t,l=l===R?e:l))})}function ft(s,l){return l=$e(l===R?s.length-1:l,0),function(){for(var e=arguments,t=-1,n=$e(e.length-l,0),r=Array(n);++t<n;)r[t]=e[l+t];for(var t=-1,o=Array(l+1);++t<l;)o[t]=e[t];o[l]=r;var i=s,a=this,u=o;switch(u.length){case 0:return i.call(a);case 1:return i.call(a,u[0]);case 2:return i.call(a,u[0],u[1]);case 3:return i.call(a,u[0],u[1],u[2])}return i.apply(a,u)}}function pt(e){return K(e)?e:kt(e)}function yt(e){var t=new e.constructor(e.byteLength);return new Se(t).set(new Se(e)),t}function dt(e,t){var n=-1,r=e.length;for(t=t||Array(r);++n<r;)t[n]=e[n];return t}function gt(e,t,n,r){n=n||{};for(var o=-1,i=t.length;++o<i;){var a=t[o],u=r?r(n[a],e[a],a,n,e):R;Qe(n,a,u===R?e[a]:u)}return n}function ht(e,t,n,r,o,i){var a=o&$,u=e.length,s=t.length;if(u!=s&&!(a&&u<s))return!1;s=i.get(e);if(s&&i.get(t))return s==t;var l=-1,c=!0,f=o&I?new He:R;for(i.set(e,t),i.set(t,e);++l<u;){var p,y=e[l],d=t[l];if((p=r?a?r(d,y,l,t,e,i):r(y,d,l,e,t,i):p)!==R){if(p)continue;c=!1;break}if(f){if(!function(e,t){for(var n=-1,r=e?e.length:0;++n<r;)if(t(e[n],n,e))return 1}(t,function(e,t){return!f.has(t)&&(y===e||n(y,e,r,o,i))&&f.add(t)})){c=!1;break}}else if(y!==d&&!n(y,d,r,o,i)){c=!1;break}}return i.delete(e),i.delete(t),c}function bt(e,t){var n,r,e=e.__data__;return("string"==(r=typeof(n=t))||"number"==r||"symbol"==r||"boolean"==r?"__proto__"!==n:null===n)?e["string"==typeof t?"string":"hash"]:e.map}function p(e,t){t=t;e=null==(e=e)?R:e[t];return ut(e)?e:R}var mt=be?ke(be,Object):qt,H=function(e){return i.call(e)};function vt(e,t){return!!(t=null==t?_:t)&&("number"==typeof e||de.test(e))&&-1<e&&e%1==0&&e<t}function _t(e,t){var n;if(!K(e))return"number"==(n=typeof e)||"symbol"==n||"boolean"==n||null==e||Ft(e)||(P.test(e)||!L.test(e)||null!=t&&e in Object(t))}function wt(e){var t=e&&e.constructor;return e===("function"==typeof t&&t.prototype||xe)}function jt(e){return e==e&&!Q(e)}function At(t,n){return function(e){return null!=e&&(e[t]===n&&(n!==R||t in Object(e)))}}(o&&H(new o(new ArrayBuffer(1)))!=z||a&&H(new a)!=D||Ce&&H(Ce.resolve())!=A||De&&H(new De)!=U||n&&H(new n)!=k)&&(H=function(e){var t=i.call(e),e=t==G?e.constructor:R,e=e?y(e):R;if(e)switch(e){case Ue:return z;case ze:return D;case We:return A;case qe:return U;case Ve:return k}return t});var kt=xt(function(e){e=It(e);var o=[];return le.test(e)&&o.push(""),e.replace(ce,function(e,t,n,r){o.push(n?r.replace(fe,"$1"):t||e)}),o});function Ot(e){var t;return"string"==typeof e||Ft(e)?e:"0"==(t=e+"")&&1/e==-b?"-0":t}function y(e){if(null!=e){try{return Me.call(e)}catch(e){}try{return e+""}catch(e){}}return""}function Et(e,t){return(K(e)?we:Ze)(e,function(e,t){var n=(n=s.iteratee||zt)===zt?st:n;return arguments.length?n(e,t):n}(t,3))}function xt(r,o){if("function"!=typeof r||o&&"function"!=typeof o)throw new TypeError("Expected a function");function i(){var e=arguments,t=o?o.apply(this,e):e[0],n=i.cache;return n.has(t)?n.get(t):(e=r.apply(this,e),i.cache=n.set(t,e),e)}return i.cache=new(xt.Cache||f),i}function J(e,t){return e===t||e!=e&&t!=t}function v(e){return Tt(e)&&q.call(e,"callee")&&(!Pe.call(e,"callee")||i.call(e)==C)}xt.Cache=f;var K=Array.isArray;function g(e){return null!=e&&Nt(e.length)&&!Bt(e)}function Tt(e){return Y(e)&&g(e)}var Mt=Ee||Vt;function Bt(e){e=Q(e)?i.call(e):"";return e==w||e==j}function Nt(e){return"number"==typeof e&&-1<e&&e%1==0&&e<=_}function Q(e){var t=typeof e;return!!e&&("object"==t||"function"==t)}function Y(e){return!!e&&"object"==typeof e}function St(e){return!(!Y(e)||i.call(e)!=G||W(e))&&(null===(e=Fe(e))||"function"==typeof(e=q.call(e,"constructor")&&e.constructor)&&e instanceof e&&Me.call(e)==Be)}function Ft(e){return"symbol"==typeof e||Y(e)&&i.call(e)==ue}var Lt,Pt=e?(Lt=e,function(e){return Lt(e)}):function(e){return Y(e)&&Nt(e.length)&&!!t[i.call(e)]};function Rt(e){return gt(e,Dt(e))}function It(e){return null==e?"":"string"==typeof(e=e)?e:Ft(e)?Xe?Xe.call(e):"":"0"==(t=e+"")&&1/e==-b?"-0":t;var t}function $t(e,t,n){e=null==e?R:ot(e,t);return e===R?n:e}function Ct(e,t){return null!=e&&function(e,t,n){for(var r,o=-1,i=(t=_t(t,e)?[t]:pt(t)).length;++o<i;){var a=Ot(t[o]);if(!(r=null!=e&&n(e,a)))break;e=e[a]}return r||!!(i=e?e.length:0)&&Nt(i)&&vt(a,i)&&(K(e)||v(e))}(e,t,it)}function Z(e){return(g(e)?Je:function(e){if(!wt(e))return Ie(e);var t,n=[];for(t in Object(e))q.call(e,t)&&"constructor"!=t&&n.push(t);return n})(e)}function Dt(e){return g(e)?Je(e,!0):lt(e)}Gt=function(e,t,n){ct(e,t,n)};var Gt,r=ft(function(e,t){var n=-1,r=t.length,o=1<r?t[r-1]:R,i=2<r?t[2]:R,o=3<Gt.length&&"function"==typeof o?(r--,o):R;for(i&&function(e,t,n){if(Q(n)){var r=typeof t;if("number"==r?g(n)&&vt(t,n.length):"string"==r&&t in n)return J(n[t],e)}return}(t[0],t[1],i)&&(o=r<3?R:o,r=1),e=Object(e);++n<r;){var a=t[n];a&&Gt(e,a,n,o)}return e});function Ut(e){return e}function zt(e){return st("function"==typeof e?e:m(e,!0))}function Wt(e){return _t(e)?(n=Ot(e),function(e){return null==e?R:e[n]}):(t=e,function(e){return ot(e,t)});var t,n}function qt(){return[]}function Vt(){return!1}s.compact=function(e){for(var t=-1,n=e?e.length:0,r=0,o=[];++t<n;){var i=e[t];i&&(o[r++]=i)}return o},s.iteratee=zt,s.keys=Z,s.keysIn=Dt,s.memoize=xt,s.merge=r,s.property=Wt,s.toPlainObject=Rt,s.clone=function(e){return m(e,!1,!0)},s.eq=J,s.forEach=Et,s.get=$t,s.hasIn=Ct,s.identity=Ut,s.isArguments=v,s.isArray=K,s.isArrayLike=g,s.isArrayLikeObject=Tt,s.isBuffer=Mt,s.isEmpty=function(e){if(g(e)&&(K(e)||"string"==typeof e||"function"==typeof e.splice||Mt(e)||v(e)))return!e.length;var t,n=H(e);if(n==D||n==U)return!e.size;if(Ge||wt(e))return!Ie(e).length;for(t in e)if(q.call(e,t))return!1;return!0},s.isFunction=Bt,s.isLength=Nt,s.isObject=Q,s.isObjectLike=Y,s.isPlainObject=St,s.isSymbol=Ft,s.isTypedArray=Pt,s.stubArray=qt,s.stubFalse=Vt,s.toString=It,s.each=Et,s.VERSION="4.15.0",he&&((he.exports=s)._=s,ge._=s)}.call(this)}.call(this)}.call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],3:[function(e,t,n){function i(e,t){if(0!==e.length){r(e[0],t);for(var n=1;n<e.length;n++)r(e[n],!t)}}function r(e,t){for(var n=0,r=0,o=0,i=e.length,a=i-1;o<i;a=o++){var u=(e[o][0]-e[a][0])*(e[a][1]+e[o][1]),s=n+u;r+=Math.abs(n)>=Math.abs(u)?n-s+u:u-s+n,n=s}0<=n+r!=!!t&&e.reverse()}t.exports=function e(t,n){var r,o=t&&t.type;if("FeatureCollection"===o)for(r=0;r<t.features.length;r++)e(t.features[r],n);else if("GeometryCollection"===o)for(r=0;r<t.geometries.length;r++)e(t.geometries[r],n);else if("Feature"===o)e(t.geometry,n);else if("Polygon"===o)i(t.coordinates,n);else if("MultiPolygon"===o)for(r=0;r<t.coordinates.length;r++)i(t.coordinates[r],n);return t}},{}],4:[function(e,t,n){t.exports=e("./polygon-features.json")},{"./polygon-features.json":5}],5:[function(e,t,n){t.exports=[{key:"building",polygon:"all"},{key:"highway",polygon:"whitelist",values:["services","rest_area","escape","elevator"]},{key:"natural",polygon:"blacklist",values:["coastline","cliff","ridge","arete","tree_row"]},{key:"landuse",polygon:"all"},{key:"waterway",polygon:"whitelist",values:["riverbank","dock","boatyard","dam"]},{key:"amenity",polygon:"all"},{key:"leisure",polygon:"all"},{key:"barrier",polygon:"whitelist",values:["city_wall","ditch","hedge","retaining_wall","wall","spikes"]},{key:"railway",polygon:"whitelist",values:["station","turntable","roundhouse","platform"]},{key:"area",polygon:"all"},{key:"boundary",polygon:"all"},{key:"man_made",polygon:"blacklist",values:["cutline","embankment","pipeline"]},{key:"power",polygon:"whitelist",values:["plant","substation","generator","transformer"]},{key:"place",polygon:"all"},{key:"shop",polygon:"all"},{key:"aeroway",polygon:"blacklist",values:["taxiway"]},{key:"tourism",polygon:"all"},{key:"historic",polygon:"all"},{key:"public_transport",polygon:"all"},{key:"office",polygon:"all"},{key:"building:part",polygon:"all"},{key:"military",polygon:"all"},{key:"ruins",polygon:"all"},{key:"area:highway",polygon:"all"},{key:"craft",polygon:"all"},{key:"golf",polygon:"all"},{key:"indoor",polygon:"all"}]},{}]},{},[1])(1)});;const bootstrapIcons=JSON.parse(localStorage.getItem('bootstrap-icons')??'{}')
if(!Object.keys(bootstrapIcons).length){fetch('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css').then(response=>{if(!response.ok)throw new Error('Response not ok.')
return response.text()}).then(text=>{text.replaceAll(' ','').split('.bi-').slice(1).forEach(i=>{const[name,unicode]=i.replaceAll('"}','').split('::before{content:"\\')
bootstrapIcons[name]=unicode})
localStorage.setItem('bootstrap-icons',JSON.stringify(bootstrapIcons))}).catch(error=>{console.log(error)})}
const titleToTooltip=(element,altTitle)=>{const title=altTitle||element.getAttribute('title')
if(!title)return
element.removeAttribute('title')
element.setAttribute('data-bs-toggle','tooltip')
element.setAttribute('data-bs-title',title)
element.setAttribute('data-bs-html','true')
const tooltip=bootstrap.Tooltip.getOrCreateInstance(element)
tooltip.setContent({'.tooltip-inner':title})
return element}
const removeTooltip=(element)=>{const tooltip=bootstrap.Tooltip.getInstance(element)
tooltip.dispose()}
document.addEventListener('DOMContentLoaded',()=>{const tooltipTriggerList=document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList=[...tooltipTriggerList].map(tooltipTriggerEl=>new bootstrap.Tooltip(tooltipTriggerEl))
document.addEventListener('show.bs.tooltip',(e)=>{document.querySelectorAll('.tooltip.bs-tooltip-auto.fade.show').forEach(i=>i.remove())})})
const setBootstrapIconsAsOptions=(element)=>{for(const i in bootstrapIcons){const option=document.createElement('option')
option.style.fontFamily='bootstrap-icons'
option.value=i
element.appendChild(option)}};const svgNS="http://www.w3.org/2000/svg"
const elementResizeObserver=(element,callback)=>{let resizeTimeout
const resizeObserver=new ResizeObserver(entries=>{for(const entry of entries){if(entry.target===element){clearTimeout(resizeTimeout);resizeTimeout=setTimeout(()=>{callback(element)},100)}}});resizeObserver.observe(element);}
const animateElement=(element,animation,{initTime=3000,timeoutMs=4000,effect='ease-in-out',resetTrigger,callback,}={})=>{let handlerTimeout
const handler=()=>setTimeout(()=>{element.classList.add(animation)
element.style.animation=`${animation} ${timeoutMs}ms ${effect}`
setTimeout(()=>{if(element.classList.contains(animation)){element.classList.remove(animation)
callback&&callback(element)}},timeoutMs-100)},initTime)
if(resetTrigger!==false){element.addEventListener(!resetTrigger||resetTrigger===true?'mouseover':resetTrigger,()=>{clearTimeout(handlerTimeout)
element.classList.remove(animation)
element.style.animation=''})
element.addEventListener('mouseout',()=>{handlerTimeout=handler()})}
handlerTimeout=handler()}
const addClassListToSelection=(parent,selector,classList)=>{parent.querySelectorAll(selector).forEach(el=>el.classList.add(...classList))}
const isViewHeight=(element)=>element.offsetHeight===window.innerHeight
const generateRandomString=(length=16)=>{const characters='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
let result=''
const charactersLength=characters.length
for(let i=0;i<length;i++){result+=characters.charAt(Math.floor(Math.random()*charactersLength))}
return result}
const canonicalize=(obj)=>{return JSON.stringify(obj,Object.keys(obj).sort())}
const hashJSON=async(jsonObj)=>{const jsonStr=canonicalize(jsonObj)
const encoder=new TextEncoder()
const data=encoder.encode(jsonStr)
const hashBuffer=await crypto.subtle.digest('SHA-256',data)
const hashArray=Array.from(new Uint8Array(hashBuffer))
return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('')}
const generateRandomColor=()=>`hsla(${Math.floor(Math.random() * 361)}, 100%, 50%, 1)`
const parseNumberFromString=(string)=>{const regex=/\d+(\.\d+)?/;const match=string.match(regex);return match?.length?parseFloat(match[0]):null}
const manageHSLAColor=(color)=>{if(!color||!color.startsWith('hsla'))return
const[h,s,l,a]=color.split(',').map(str=>parseNumberFromString(str))
const obj={h:h||1,s,l,a:a??1,}
obj.toString=({h=obj.h,s=obj.s,l=obj.l,a=obj.a,}={})=>{return`hsla(${h}, ${s}%, ${l}%, ${a})`}
return obj}
const pushURLParams=(url,params)=>{const urlObj=new URL(url)
for(const key in params){urlObj.searchParams.set(key,params[key])}
return urlObj.toString()}
const formatNumberWithCommas=(number)=>{let[integer,decimal]=number.toString().split(".")
integer=integer.replaceAll(/\B(?=(\d{3})+(?!\d))/g,",")
return integer+(decimal?"."+decimal:'')}
const toggleCollapseElements=(parent)=>{const collapseElements=Array.from(parent.querySelectorAll('.collapse'))
const hide=collapseElements.some(el=>el.classList.contains('show'))
collapseElements.forEach(el=>{if(el.classList.contains('show')===hide){const instance=bootstrap.Collapse.getOrCreateInstance(el)
hide?instance.hide():instance.show()}})}
const hslToHex=({h,s,l}={})=>{if(!h||!s||!l)return
l/=100
const a=s*Math.min(l,1-l)/100
const f=n=>{const k=(n+h/30)%12
const color=l-a*Math.max(Math.min(k-3,9-k,1),-1)
return Math.round(255*color).toString(16).padStart(2,'0')}
return`#${f(0)}${f(8)}${f(4)}`}
const hexToRGB=(hex)=>{hex=hex.replace(/^#/,'');if(hex.length===3){hex=hex.split('').map(c=>c+c).join('')}
const bigint=parseInt(hex,16)
const r=(bigint>>16)&255
const g=(bigint>>8)&255
const b=bigint&255
return`rgb(${r}, ${g}, ${b})`}
const rgbToHSLA=(rgb)=>{rgb=rgb.split('(')[rgb.split('(').length-1].split(',')
let r=parseInt(rgb[0])/255
let g=parseInt(rgb[1])/255
let b=parseInt(rgb[2])/255
let max=Math.max(r,g,b)
let min=Math.min(r,g,b)
let delta=max-min
let l=(max+min)/2;let s=0
if(delta!==0){s=l<0.5?delta/(max+min):delta/(2-max-min);}
let h=0
if(delta!==0){if(max===r){h=(g-b)/delta}else if(max===g){h=2+(b-r)/delta}else if(max===b){h=4+(r-g)/delta}}
h=Math.round(h*60)
if(h<0){h+=360}
s=+(s*100).toFixed(1)
l=+(l*100).toFixed(1)
return`hsla(${h}, ${s}%, ${l}%, 1)`}
const hexToHSLA=(hex)=>{return rgbToHSLA(hexToRGB(hex))}
const outerHTMLToDataURL=async(outerHTML,{backgroundColor=null,width=null,height=null,x=0,y=0,}={})=>{const element=customCreateElement({innerHTML:outerHTML}).firstChild
if(element instanceof Element){document.body.appendChild(element)
try{const canvas=await html2canvas(element,{backgroundColor,width,height,x,y,})
return canvas.toDataURL('image/png')}catch(error){console.log(error)}finally{element.remove()}}}
const createNewImage=(src,{opacity=1,angle=0,width=null,height=null,}={})=>{return new Promise((resolve,reject)=>{const img=new Image()
img.crossOrigin="anonymous"
img.src=src
img.onload=()=>{const canvas=document.createElement("canvas")
const ctx=canvas.getContext("2d")
const radians=(angle*Math.PI)/180
canvas.width=Math.max(Math.abs(img.width*Math.cos(radians))+Math.abs(img.height*Math.sin(radians)),(width||0))
canvas.height=Math.max(Math.abs(img.width*Math.sin(radians))+Math.abs(img.height*Math.cos(radians)),(height||0))
ctx.translate(canvas.width/2,canvas.height/2)
ctx.rotate(radians)
ctx.globalAlpha=opacity
ctx.drawImage(img,-img.width/2,-img.height/2);const dataUrl=canvas.toDataURL("image/png")
resolve(dataUrl)}
img.onerror=(e)=>{reject()}})}
const svgToDataURL=(svg)=>{return new Promise((resolve,reject)=>{const canvas=document.createElement("canvas")
const ctx=canvas.getContext("2d")
const svgBlob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"})
const blobURL=URL.createObjectURL(svgBlob)
const img=new Image()
img.onload=()=>{canvas.width=img.width
canvas.height=img.height
ctx.drawImage(img,0,0)
URL.revokeObjectURL(blobURL)
const dataUrl=canvas.toDataURL("image/png")
resolve(dataUrl)}
img.onerror=()=>{URL.revokeObjectURL(blobURL)
reject(new Error("Failed to load the SVG into the Image object"))}
img.src=blobURL})}
const resetController=({controller,message='Aborted.'}={})=>{if(controller)controller.abort(message)
controller=new AbortController()
controller.id=generateRandomString()
return controller}
const relationHandlers=(name)=>{return{equals:(v1,v2,{caseSensitive=true}={})=>{const v2IsNum=!isNaN(Number(v2))
const v1Str=v2IsNum?parseFloat(v1):String(v1)
const v2Str=v2IsNum?parseFloat(v2):String(v2)
if(v2IsNum||caseSensitive){return v1Str===v2Str}else{return v1Str.toLowerCase()===v2Str.toLowerCase()}},contains:(v1,v2,{caseSensitive=true}={})=>{const v1Str=String(v1)
const v2Str=String(v2)
if(caseSensitive){return v1Str.includes(v2Str)}else{return v1Str.toLowerCase().includes(v2Str.toLowerCase())}},greaterThan:(v1,v2)=>{const v1Num=parseFloat(v1)
const v2Num=parseFloat(v2)
if(isNaN(v1Num)||isNaN(v2Num))throw new Error('NaN')
return v1Num>v2Num},greaterThanEqualTo:(v1,v2)=>{const v1Num=parseFloat(v1)
const v2Num=parseFloat(v2)
if(isNaN(v1Num)||isNaN(v2Num))throw new Error('NaN')
return v1Num>=v2Num},lessThan:(v1,v2)=>{const v1Num=parseFloat(v1)
const v2Num=parseFloat(v2)
if(isNaN(v1Num)||isNaN(v2Num))throw new Error('NaN')
return v1Num<v2Num},lessThanEqualTo:(v1,v2)=>{const v1Num=parseFloat(v1)
const v2Num=parseFloat(v2)
if(isNaN(v1Num)||isNaN(v2Num))throw new Error('NaN')
return v1Num<=v2Num},}[name]}
const removeWhitespace=(str)=>(str.replaceAll(/\s{2,}/g,' ')).trim()
const makeMovable=(element)=>{let isDragging=false,offsetX,offsetY
element.addEventListener("mousedown",(e)=>{if(e.target.getAttribute('name'))return
isDragging=true
offsetX=e.clientX-element.offsetLeft
offsetY=e.clientY-element.offsetTop
element.style.cursor="grabbing"})
document.addEventListener("mousemove",(e)=>{if(!isDragging)return
element.style.left=`${e.clientX - offsetX}px`
element.style.top=`${e.clientY - offsetY}px`})
document.addEventListener("mouseup",()=>{isDragging=false
element.style.cursor=""})}
const isCompressedFile=(file)=>{const compressedExtensions=['zip','kmz','rar','7z','tar','gz']
const fileName=file.name.toLowerCase()
const fileExtension=fileName.split('.').pop()
return compressedExtensions.includes(fileExtension)}
const getZippedFiles=async(zipFile,basePath)=>{try{const zip=await JSZip.loadAsync(zipFile)
const filesArray=[]
for(const relativePath in zip.files){const filename=[basePath,relativePath].filter(i=>i).join('/')
const entry=zip.files[relativePath]
if(!entry.dir){const content=await entry.async('blob')
const file=new File([content],filename,{lastModified:entry.date.getTime(),})
if(isCompressedFile(file)){(await getZippedFiles(file,filename)).forEach(i=>filesArray.push(i))}else{filesArray.push(file)}}}
return filesArray}catch(error){throw new Error(`Error processing zip file: ${error.message}`)}}
const getValidFilesArray=async(filesArray)=>{const files=[]
const handler=async(filesArray)=>{for(const file of filesArray){if(isCompressedFile(file)){const zippedFiles=await getZippedFiles(file,file.name)
await handler(zippedFiles)}else{files.push(file)}}}
await handler(filesArray)
return files}
const getFileRawData=async(file)=>{return new Promise((resolve,reject)=>{const reader=new FileReader()
reader.onload=async(e)=>{try{resolve(e.target.result)}catch(error){console.log(error)
reject(error)}
reject(new Error('unsupported file'))}
reader.onerror=async(e)=>{reject()}
reader.readAsText(file)})}
const removeQueryParams=(urlString)=>{const url=new URL(urlString)
url.search=''
return url.toString()}
const pushQueryParamsToURLString=(url,params)=>{const url_obj=new URL(url)
for(const key in params){url_obj.searchParams.set(key,params[key])}
return url_obj.toString()}
const parseXML=(xmlString)=>{const parser=new DOMParser();const xmlDoc=parser.parseFromString(xmlString,'text/xml');const rootElement=xmlDoc.documentElement;let namespace
const namespaces=rootElement.attributes;for(let i=0;i<namespaces.length;i++){const name=namespaces.item(i).name
if(name.startsWith('xmlns')){namespace=namespaces.item(i).value}}
return[namespace,rootElement]}
const isElementFullyVisible=(el,{margin=0}={})=>{const rect=el.getBoundingClientRect()
return(rect.top>=margin&&rect.left>=margin&&rect.bottom<=((window.innerHeight||document.documentElement.clientHeight)-margin)&&rect.right<=((window.innerWidth||document.documentElement.clientWidth)-margin))}
const getSpecialCharacters=(str)=>{const matches=str.match(/[^a-zA-Z0-9]/g)
return matches?[...new Set(matches)]:[]};const contextMenuHandler=(e,menuItems,{title,dismissBtn=false,style={},movable=false,}={})=>{L.DomEvent.stopPropagation(e)
L.DomEvent.preventDefault(e)
document.querySelector(`.custom-context-menu`)?.remove()
const menuContainer=document.createElement('ul')
menuContainer.className=removeWhitespace(`
        text-bg-${getPreferredTheme()} 
        custom-context-menu
        dropdown-menu show
        small shadow-sm
    `)
Object.keys(style).forEach(k=>menuContainer.style[k]=style[k])
if(title||dismissBtn){const header=customCreateElement({parent:menuContainer,className:'d-flex flex-nowrap px-3 mb-2',style:{fontSize:'14px'}})
if(title){const titleSpan=createSpan(title,{parent:header,className:'fw-medium'})}
if(dismissBtn){const dismissIcon=createIcon({parent:header,peNone:false,className:'bi bi-x ms-auto custom-context-menu-dismiss',events:{click:(e)=>menuContainer.remove()}})}}
if(movable){makeMovable(menuContainer)}
for(const item in menuItems){const data=menuItems[item]
if(!data)continue
const btnCallback=data.btnCallback
if(btnCallback){delete data.btnCallback
data.btnCallback=(e)=>{L.DomEvent.stopPropagation(e)
L.DomEvent.preventDefault(e)
if(!data.keepMenuOn)menuContainer.remove()
btnCallback(e)}}
const li=createDropdownMenuLi({...data,parent:menuContainer})}
document.body.appendChild(menuContainer)
const menuContainerWidth=menuContainer.offsetWidth
const menuContainerHeight=menuContainer.offsetHeight
const windowWidth=window.innerWidth
const windowHeight=window.innerHeight
const x=e.x
const y=e.y
const left=x===0?((windowWidth-menuContainerWidth)*0.5):((windowWidth-x-menuContainerWidth-10)>=0?x:x-menuContainerWidth)
const top=y===0?((windowHeight-menuContainerHeight)*0.30):((windowHeight-y-menuContainerHeight-10)>=0?y:y-menuContainerHeight)
menuContainer.style.left=`${left > 10 ? left : 10}px`
menuContainer.style.top=`${top > 10 ? top : 10}px`
return menuContainer}
document.addEventListener('DOMContentLoaded',()=>{const handler=(e)=>{const menu=document.querySelector(`.custom-context-menu`)
if(menu){const dismissBtn=menu.querySelector('.custom-context-menu-dismiss')
const escape=e.type==='resize'&&!isElementFullyVisible(menu)
if(!dismissBtn||escape){menu.remove()}}}
['wheel','click'].forEach(trigger=>{document.addEventListener(trigger,handler)})
window.addEventListener("resize",handler)});const customCreateElement=({tag='div',id,className='',parent,style={},innerHTML='',attrs={},events={},innerText=''}={})=>{const element=document.createElement(tag)
element.id=id||generateRandomString()
element.className=className
parent?.appendChild(element)
Object.keys(style).forEach(k=>element.style[k]=style[k])
Object.keys(attrs).forEach(k=>element.setAttribute(k,attrs[k]))
Object.keys(events).forEach(k=>element.addEventListener(k,events[k]))
if(innerHTML)element.innerHTML=innerHTML
if(innerText)element.innerText=innerText
return element}
const createButton=({id,className='',iconSpecs,title,disabled,parent,innerText,textClass='',events={},attrs={},style={},name,}={})=>{const btn=document.createElement('button')
if(id)btn.id=id
btn.className=`btn ${className}`
btn.setAttribute('type','button')
Object.keys(attrs).forEach(k=>btn.setAttribute(k,attrs[k]))
if(name)btn.setAttribute('name',name)
if(title)btn.setAttribute('title',title)
if(disabled)btn.setAttribute('disabled',true)
if(iconSpecs)createIcon({className:`bi ${iconSpecs}`,parent:btn})
if(innerText)createSpan(innerText,{parent:btn,className:`${textClass}`})
Object.keys(style).forEach(k=>btn.style[k]=style[k])
Object.keys(events).forEach(k=>btn.addEventListener(k,events[k]))
parent?.appendChild(btn)
return btn}
const createIcon=({className='',parent,peNone=true,title,style={},attrs={},events={},}={})=>{const icon=document.createElement('i')
icon.className=`${className} ${peNone ? 'pe-none' : ''}`
Object.keys(style).forEach(k=>icon.style[k]=style[k])
Object.keys(attrs).forEach(k=>icon.setAttribute(k,attrs[k]))
Object.keys(events).forEach(k=>icon.addEventListener(k,events[k]))
if(!peNone)icon.style.cursor='pointer'
if(title)icon.setAttribute('title',title)
parent?.appendChild(icon)
return icon}
const createSpan=(innerText,{id,className='',parent}={})=>{const label=document.createElement('span')
if(id)label.id=id
label.innerText=innerText
label.className=`${className}`
parent?.appendChild(label)
return label}
const createOffcanvasToggle=(id,{tag,className,themed,label,show,title,parent}={})=>{const toggle=document.createElement(tag)
toggle.className=removeWhitespace(`
        ${className || ''}
        ${tag === 'button' ?  `btn` : ''}
        ${themed ? `${tag==='button'?'btn':'text-bg'}-${getPreferredTheme()}` : ''}
        ${label ? 'rounded-pill' : 'rounded-circle'}
        ${show ? 'd-lg-none' : ''}
        shadow-lg d-flex flex-nowrap
    `)
toggle.setAttribute(`${tag === 'button' ? 'type' : 'role'}`,'button')
toggle.setAttribute('data-bs-toggle','offcanvas')
toggle.setAttribute('data-bs-target',`#${id}`)
toggle.setAttribute('aria-controls',id)
toggle.setAttribute('title',title)
parent?.appendChild(toggle)
return toggle}
const createOffcanvasElement=(id,{show,className='',themed,titleText,titleClass,toggleIcon='bi-layout-sidebar-inset',toggleBtns=[]}={})=>{const offcanvas=document.createElement('div')
offcanvas.id=id
offcanvas.className=removeWhitespace(`
        ${className}
        ${show ? 'offcanvas-lg' : 'offcanvas'}
        ${themed ? `text-bg-${getPreferredTheme()}` : ''}
        shadow-lg border-0 p-0 d-flex flex-column
    `)
offcanvas.setAttribute('aria-labelledby',`${id}Label`)
offcanvas.setAttribute('data-bs-scroll',`true`)
offcanvas.setAttribute('data-bs-backdrop',`false`)
const header=document.createElement('div')
header.className='offcanvas-header d-flex justify-content-between'
offcanvas.appendChild(header)
const title=document.createElement('h5')
title.id=`${id}Label`
title.className=`offcanvas-title ${titleClass || ''}`
title.innerText=titleText
header.appendChild(title)
const toggleContainer=document.createElement('div')
toggleContainer.className='d-flex flex-nowrap ms-5'
header.appendChild(toggleContainer)
const toggleClassName='border-0 bg-transparent fs-16 p-0 ms-3 text-muted bi'
toggleBtns.forEach(i=>{toggleContainer.appendChild(i)})
const sidebarToggle=document.createElement('button')
sidebarToggle.className=`${toggleClassName} ${show ? toggleIcon : 'bi-window-sidebar'} d-none d-lg-inline`
sidebarToggle.setAttribute('type','button')
sidebarToggle.setAttribute('onclick',`toggleSidebar("#${id}")`)
sidebarToggle.setAttribute('title',`Toggle ${titleText}`)
toggleContainer.appendChild(sidebarToggle)
const dismissToggle=document.createElement('button')
dismissToggle.className=`${toggleClassName} ${show ? 'd-lg-none' : ''} bi-x-lg`
dismissToggle.setAttribute('type','button')
dismissToggle.setAttribute('data-bs-dismiss','offcanvas')
dismissToggle.setAttribute('data-bs-target',`#${id}`)
dismissToggle.setAttribute('aria-label','Close')
toggleContainer.appendChild(dismissToggle)
const nav=document.createElement('div')
nav.className='offcanvas-nav'
offcanvas.appendChild(nav)
const body=document.createElement('div')
body.className='offcanvas-body overflow-auto flex-grow-1 d-flex p-0 rounded-bottom'
offcanvas.appendChild(body)
return offcanvas}
const createOffcanvas=(id,{themed,show,offcanvasClass,toggleTag='button',toggleClass='',toggleLabelText,toggleTitle=`Toggle ${toggleLabelText ? toggleLabelText : 'sidebar'}`,toggleParent,toggleiconSpecs,toggleLabelClass='',titleText=toggleLabelText,titleClass,offcanvasToggleIcon,toggleBtns,}={})=>{const toggle=createOffcanvasToggle(id,{themed:themed,show:show,tag:toggleTag,className:toggleClass,title:toggleTitle,parent:toggleParent,label:toggleLabelText})
if(toggleiconSpecs)createIcon({className:`bi ${toggleiconSpecs}`,parent:toggle})
if(toggleLabelText)createSpan(toggleLabelText,{className:`ms-2 text-nowrap ${toggleLabelClass}`,parent:toggle})
const offcanvas=createOffcanvasElement(id,{show:show,className:offcanvasClass,themed:themed,titleText:titleText,titleClass:titleClass,toggleIcon:offcanvasToggleIcon,toggleBtns,})
return[toggle,offcanvas]}
const createNavItem=({parent}={})=>{const navItem=document.createElement('li')
navItem.className='nav-item'
parent?.appendChild(navItem)
return navItem}
const createAccordionNavTabs=(id,tabData,{themed,parent}={})=>{const navTabs=document.createElement('ul')
navTabs.className=`nav nav-tabs card-header-tabs d-flex flex-nowrap`
parent?.appendChild(navTabs)
Object.keys(tabData).forEach(suffix=>{const data=tabData[suffix]
const navItem=createNavItem({parent:navTabs,})
const navButton=document.createElement('button')
navButton.className=removeWhitespace(`
            accordion-button rounded-top me-2 pe-2 ps-3 py-1
            ${themed ? `text-bg-${getPreferredTheme()}` : ''}
            ${data.active ? '' : 'collapsed'}
            ${data.active || data.disabled ? 'disabled' : ''}
        `)
if(data.active||data.disabled)navButton.setAttribute('disabled','true')
navButton.setAttribute('type','button')
navButton.setAttribute('data-bs-toggle','collapse')
navButton.setAttribute('data-bs-target',`#${id}-${suffix}`)
navButton.setAttribute('aria-expanded',`${data.active ? 'true' : 'false'}`)
navButton.setAttribute('aria-controls',`${id}-${suffix}`)
navButton.innerText=data.label
navItem.appendChild(navButton)
navButton.addEventListener('click',()=>{navTabs.querySelectorAll(`.accordion-button`).forEach(btn=>{if(navButton===btn){btn.disabled=true}else{btn.disabled=false}})})})
createNavItem({parent:navTabs,})
return navTabs}
const createAccordionElement=(id,tabData,{themed,parent,accordionCollapseClass='',}={})=>{const accordion=document.createElement('div')
accordion.id=id
accordion.className=removeWhitespace(`
        accordion accordion-flush px-0 flex-grow-1 d-flex flex-column
        ${themed ? `text-bg-${getPreferredTheme()}` : ''}
    `)
parent?.appendChild(accordion)
Object.keys(tabData).forEach(suffix=>{const data=tabData[suffix]
const accordionCollapse=document.createElement('div')
accordionCollapse.id=`${id}-${suffix}`
accordionCollapse.className=removeWhitespace(`
            accordion-collapse collapse flex-grow-1 fade
            ${accordionCollapseClass}
            ${data.active ? 'show' : ''}
        `)
accordionCollapse.setAttribute('data-bs-parent',`#${id}`)
accordion.appendChild(accordionCollapse)
const accordionBody=document.createElement('div')
accordionBody.className='accordion-body h-100 p-0 d-flex flex-column flex-grow-1'
accordionCollapse.appendChild(accordionBody)})
return accordion}
const createAccordion=(id,tabData,{themed=false,accordionCollapseClass='',}={})=>{const tabs=createAccordionNavTabs(id,tabData,{themed})
const accordion=createAccordionElement(id,tabData,{themed,accordionCollapseClass,})
return[tabs,accordion]}
const createDropdownMenuLi=({innerText,innerHTML,child,parent,btnCallback,divider=false,}={})=>{const li=document.createElement('li')
parent?.appendChild(li)
let element
if(divider){element=document.createElement('hr')
element.className='dropdown-divider'}else if(innerHTML){element=customCreateElement({innerHTML}).firstChild}else if(child){element=child}else if(innerText||btnCallback){element=document.createElement('button')
element.className='dropdown-item bg-transparent border-0 btn btn-sm fs-12'
if(btnCallback)element.addEventListener('click',btnCallback)
const label=createSpan(innerText??'',{className:'pe-none'})
element.appendChild(label)}
li.appendChild(element)
return li}
const createDropdown=({btnClassName='',btniconSpecs,btnTitle,menuClassName,}={})=>{const dropdown=document.createElement('div')
dropdown.className='dropdown'
const toggle=createButton({className:`dropdown-toggle ${btnClassName}`,iconSpecs:btniconSpecs,attrs:{title:btnTitle,}})
toggle.setAttribute('data-bs-toggle','dropdown')
toggle.setAttribute('aria-expanded','false')
dropdown.appendChild(toggle)
const menu=document.createElement('ul')
menu.className=`dropdown-menu ${menuClassName}`
dropdown.appendChild(menu)
return[dropdown,toggle,menu]}
const createCheckboxOptions=({options,name=generateRandomString(),containerClass='',parent,type='checkbox',}={})=>{const container=document.createElement('div')
container.className=`d-flex ${containerClass}`
parent?.appendChild(container)
for(const option in options){const data=options[option]
const formCheck=document.createElement('div')
formCheck.className='form-check m-0'
container.appendChild(formCheck)
const id=data.id||generateRandomString()
const input=document.createElement('input')
input.id=id
input.value=option
input.className='form-check-input'
input.setAttribute('type',data.type??type)
input.setAttribute('name',data.name?`${name}-${data.name}`:(type==='radio'?name:`${name}-${generateRandomString()}`))
input.checked=data.checked||false
input.disabled=data.disabled||false
Object.keys(data.inputAttrs??{}).forEach(attr=>input.setAttribute(attr,data.inputAttrs[attr]))
Object.keys(data.events??{}).forEach(k=>input.addEventListener(k,data.events[k]))
formCheck.appendChild(input)
const label=document.createElement('label')
label.className='form-check-label'
label.setAttribute('for',id)
label.innerText=data.label??option
if(data.labelAttrs)Object.keys(data.labelAttrs).forEach(attr=>label.setAttribute(attr,data.labelAttrs[attr]))
formCheck.appendChild(label)}
return container}
const createFormCheck=({parent,inputValue='',inputId=generateRandomString(),labelInnerText='',fieldClass='',formCheckClass='',formCheckAttrs={},formCheckStyle={},disabled=false,checked=false,labelClass='',events={},role,name,type='checkbox',style={},}={})=>{const formCheck=document.createElement('div')
formCheck.className=`form-check m-0 ${formCheckClass} ${role == 'switch' ? 'form-switch' : ''}`
Object.keys(formCheckAttrs).forEach(i=>formCheck.setAttribute(i,formCheckAttrs[i]))
Object.keys(formCheckStyle).forEach(i=>formCheck.style[i]=formCheckStyle[i])
parent?.appendChild(formCheck)
const input=document.createElement('input')
input.id=inputId
input.className=`form-check-input ${fieldClass}`
input.setAttribute('type',type)
if(role)input.setAttribute('role',role)
if(name)input.setAttribute('name',name)
input.value=inputValue
input.disabled=disabled
input.checked=checked
formCheck.appendChild(input)
Object.keys(events).forEach(k=>input.addEventListener(k,events[k]))
Object.keys(style).forEach(k=>input.style[k]=style[k])
const label=document.createElement('label')
label.className=`form-check-label ${labelClass}`
label.setAttribute('for',input.id)
label.innerText=labelInnerText
formCheck.appendChild(label)
return formCheck}
const createObjectTRs=(object,parent,{}={})=>{const handler=(key,value,{prefixes=[]}={})=>{if(!value)return
if(typeof value==='object'){prefixes.push(key)
Object.keys(value).forEach(subKey=>{const subValue=value[subKey]
handler(subKey,subValue,{prefixes})})}else{const tr=document.createElement('tr')
parent.appendChild(tr)
const label=innerText=[...new Set([...prefixes,key])].map(i=>`${i[0].toUpperCase()}${i.slice(1)}`).join(' ')
const th=document.createElement('th')
th.className='bg-transparent'
th.setAttribute('scope','row')
th.innerText=label
tr.appendChild(th)
const td=document.createElement('td')
td.className='bg-transparent'
td.innerText=value.toString()
tr.appendChild(td)}}
for(const key in object)handler(key,object[key])}
const createModal=({titleText,parent,contentBody,footerBtnText='Save',show=false,static=false,closeBtn=true,centered=true,footerBtns={},className='',}={})=>{const modal=document.createElement('div')
modal.className=`modal fade ${className}`
modal.setAttribute('tabindex','-1')
if(static){modal.setAttribute('data-bs-backdrop','static')
modal.setAttribute('data-bs-keyboard','false')}
parent?.appendChild(modal)
const dialog=document.createElement('div')
dialog.className=`modal-dialog modal-dialog-scrollable ${centered ? 'modal-dialog-centered' : ''}`
modal.appendChild(dialog)
const content=document.createElement('div')
content.className='modal-content'
dialog.appendChild(content)
const header=document.createElement('div')
header.className='modal-header'
content.appendChild(header)
const title=document.createElement('h5')
title.className='modal-title'
if(titleText)title.innerText=titleText
header.appendChild(title)
if(closeBtn){const close=document.createElement('button')
close.className='btn-close'
close.setAttribute('type','button')
close.setAttribute('data-bs-dismiss','modal')
close.setAttribute('aria-label','Close')
header.appendChild(close)}
if(contentBody instanceof Element){content.appendChild(contentBody)}else{const body=document.createElement('div')
content.appendChild(body)
if(typeof contentBody==='string'){body.outerHTML=contentBody}}
const footer=document.createElement('div')
footer.className=`modal-footer d-flex justify-content-start`
content.appendChild(footer)
if(Object.keys(footerBtns).length){Object.values(footerBtns).forEach(btn=>{footer.appendChild(btn)})}else{const btn=document.createElement('div')
btn.className=`btn btn-${getPreferredTheme()}`
btn.innerText=footerBtnText
footer.appendChild(btn)}
if(show){const bsModal=new bootstrap.Modal(modal)
bsModal.show()}
return modal}
const createFormFloating=({parent,fieldTag='input',fieldAttrs={},fieldId,fieldClass='',labelText='',labelClass='',events={},options,currentValue='',fieldStyle={},containerClass='',disabled=false,fieldMultiple=false,}={})=>{const container=document.createElement('div')
container.className=`form-floating ${containerClass}`
parent?.appendChild(container)
const field=document.createElement(fieldTag)
field.id=fieldId||generateRandomString()
field.className=`${fieldClass} ${fieldTag === 'select' ? 'form-select' : 'form-control'}`
Object.keys(fieldAttrs).forEach(k=>field.setAttribute(k,fieldAttrs[k]))
Object.keys(fieldStyle).forEach(k=>field.style[k]=fieldStyle[k])
container.appendChild(field)
field.disabled=disabled
if(fieldTag==='select')field.multiple=fieldMultiple
if(fieldTag==='select'&&options){for(const value in options){const option=document.createElement('option')
option.value=value
option.text=options[value]
field.appendChild(option)
if(fieldMultiple&&currentValue.includes(value)){option.selected=true}else if(value===currentValue){option.selected=true}}}else{if(currentValue)field.value=currentValue}
Object.keys(events).forEach(trigger=>{field.addEventListener(trigger,events[trigger])})
const label=document.createElement('label')
label.className=`${labelClass}`
label.setAttribute('for',field.id)
if(labelText instanceof Element){label.appendChild(labelText)}else{label.innerText=labelText}
container.appendChild(label)
return container}
const createInputGroup=({parent,prefixHTML,fieldTag='input',fieldClass='',suffixHTML,events={},fieldAttrs={},disabled=false,inputGroupClass='',currentValue,options,fieldMultiple=false,}={})=>{const inputGroup=document.createElement('div')
inputGroup.className=`input-group ${inputGroupClass}`
parent?.appendChild(inputGroup)
let prefix
let suffix
if(prefixHTML){prefix=document.createElement('div')
prefix.className=`input-group-text`
prefix.id=generateRandomString()
if(prefixHTML instanceof Element){prefix.appendChild(prefixHTML)}else{prefix.innerHTML=prefixHTML}
inputGroup.appendChild(prefix)}
const field=document.createElement(fieldTag)
Object.keys(fieldAttrs).forEach(k=>field.setAttribute(k,fieldAttrs[k]))
field.className=`${fieldTag === 'select' ? 'form-select' : 'form-control'} ${fieldClass}`
inputGroup.appendChild(field)
if(fieldTag==='select'&&options){for(const value in options){const option=document.createElement('option')
option.value=value
option.text=options[value]
field.appendChild(option)
if(fieldMultiple&&currentValue.includes(value)){option.selected=true}else if(value===currentValue){option.selected=true}}}else{if(currentValue)field.value=currentValue}
field.disabled=disabled
Object.keys(events).forEach(trigger=>{field.addEventListener(trigger,events[trigger])})
if(suffixHTML){suffix=document.createElement('div')
suffix.className=`input-group-text`
suffix.id=generateRandomString()
if(suffixHTML instanceof Element){suffix.appendChild(suffixHTML)}else{suffix.innerHTML=suffixHTML}
inputGroup.appendChild(suffix)}
field.setAttribute('aria-describedby',prefix?.id||suffix?.id)
return inputGroup}
const createTagifyField=({parent,name,inputTag='input',placeholder,enabled,currentValue,inputClass='',delimiters=null,whitelist=[],enforceWhitelist=true,callbacks={},dropdownClass='',userInput=true,disabled=false,scopeStyle={},maxItems=Infinity,maxTags=100,events={},}={})=>{const input=document.createElement(inputTag)
input.className=`${inputClass}`
if(name)input.setAttribute('name',name)
if(placeholder)input.setAttribute('placeholder',placeholder)
if(currentValue)input.value=currentValue
parent?.appendChild(input)
input.disabled=disabled
const tagifyObj=new Tagify(input,{whitelist,enforceWhitelist,userInput,delimiters,callbacks,maxTags,dropdown:{maxItems,classname:dropdownClass,enabled,closeOnSelect:false}})
Object.keys(events).forEach(i=>tagifyObj.DOM.scope.addEventListener(i,events[i]))
Object.keys(scopeStyle).forEach(i=>tagifyObj.DOM.scope.style[i]=scopeStyle[i])}
const createBadgeSelect=({id=generateRandomString(),selectClass='',attrs={},disabled=false,parent,options={},currentValue,events={},rounded=true}={})=>{const select=document.createElement('select')
select.id=id
select.className=`badge ${rounded ? 'rounded-pill' : ''} ${selectClass}`
Object.keys(attrs).forEach(k=>select.setAttribute(k,attrs[k]))
Object.keys(events).forEach(k=>select.addEventListener(k,events[k]))
select.disabled=disabled
parent?.appendChild(select)
for(const i in options){const option=document.createElement('option')
option.value=i
option.text=options[i]
if(currentValue&&i===currentValue)option.setAttribute('selected',true)
select.appendChild(option)}
return select}
const getSpinnerHTML=({text='Loading...'}={})=>{return removeWhitespace(`
        <div class="d-flex justify-content-center m-3 gap-2">
            <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <span role="status">${text}</span>
        </div>
    `)};const setCookie=(name,value,days)=>{let prefix=document.cookie=name+"="+value
if(days){const date=new Date()
date.setTime(date.getTime()+(days*24*60*60*1000))
const expires="expires="+date.toUTCString()
prefix=prefix+";"+expires}
document.cookie=prefix+";path=/"}
const getCookie=(name)=>{const nameEQ=name+"=";const cookiesArray=document.cookie.split(';');for(let i=0;i<cookiesArray.length;i++){let cookie=cookiesArray[i];while(cookie.charAt(0)===' '){cookie=cookie.substring(1,cookie.length);}
if(cookie.indexOf(nameEQ)===0){return cookie.substring(nameEQ.length,cookie.length);}}
return null;};const getPreferredTheme=()=>getCookie('theme')??'dark'
const themedElements=(theme,parent=document)=>{let setThemeTimeout
Array([['bi-moon'],['bi-moon-fill']],[['btn-light'],['btn-dark']],[['btn-outline-dark'],['btn-outline-light']],[['text-light'],['text-dark']],[['text-bg-light'],['text-bg-dark']],[['bg-light'],['bg-dark']],[['border-light'],['border-dark']],[['table-light'],['table-dark']],[['img-light'],['img-dark']],[['layer-light'],['layer-dark']],).forEach(classes=>{const[addClasses,removeClasses]=theme==='light'?classes:classes.reverse()
parent.querySelectorAll(`.${addClasses.join('.')}:not(.ignore-theme), .${removeClasses.join('.')}:not(.ignore-theme)`).forEach(element=>{element.classList.remove(...removeClasses)
element.classList.add(...addClasses)
clearTimeout(setThemeTimeout)
setThemeTimeout=setTimeout(()=>{const setThemeEvent=new Event('setTheme')
document.dispatchEvent(setThemeEvent)},200)})})}
const setTheme=(theme)=>{theme=!theme||theme==='auto'?getPreferredTheme():theme
document.documentElement.setAttribute('data-bs-theme',theme)
setCookie('theme',theme)
themedElements(theme)}
const toggleTheme=()=>{const currentTheme=document.documentElement.getAttribute('data-bs-theme')
setTheme(currentTheme==='dark'?'light':'dark')};;const toggleSidebar=(sidebarSelector)=>{const sidebar=document.querySelector(sidebarSelector)
const toggle=document.querySelector(`[data-bs-toggle="offcanvas"][data-bs-target="${sidebarSelector}"]`)
const sidebarGutter=sidebar.parentElement.querySelector('.sidebar-gutter')
const button=sidebar.querySelector(`[onclick='toggleSidebar("${sidebarSelector}")']`)
const dismiss=sidebar.querySelector(`[data-bs-dismiss="offcanvas"][data-bs-target="${sidebarSelector}"]`)
const isLg=sidebar.classList.toggle('offcanvas-lg')
setCookie(`show_${sidebarSelector}`,isLg)
sidebar.classList.toggle('offcanvas',!isLg)
if(sidebar.classList.contains('show'))toggle.click()
button.classList.toggle('bi-layout-sidebar-inset',isLg)
button.classList.toggle('bi-window-sidebar',!isLg)
if(sidebarGutter)sidebarGutter.classList.toggle('d-lg-block',isLg)
dismiss.classList.toggle('d-lg-none',isLg)
toggle.classList.toggle('d-lg-none',isLg)}
const resizeSidebar=(sidebarSelector)=>{const sidebar=document.querySelector(sidebarSelector)
const sidebarWidth=sidebar.offsetWidth
const startX=event.type==='touchstart'?event.touches[0].clientX:event.clientX
const mouseMoveHandler=(event)=>{document.body.classList.add('user-select-none')
const newX=event.type==='touchmove'?event.touches[0].clientX:event.clientX
const moveX=newX-startX
sidebar.style.width=`${sidebarWidth + moveX}px`;}
const mouseUpHandler=()=>{document.body.classList.remove('user-select-none')
const rowWidth=sidebar.parentElement.offsetWidth
const sidebarWidth=sidebar.offsetWidth
let col=Math.floor(sidebarWidth/(rowWidth/12))
if(col>0){if(col<4)col=4
if(col>7)col=7
sidebar.classList.forEach(className=>{if(className.includes('col-lg-')){sidebar.classList.remove(className)}})
sidebar.classList.add(`col-lg-${col}`)}else{toggleSidebar(sidebarSelector)}
sidebar.style.width=''}
Array('mousemove','touchmove').forEach(moveTrigger=>{document.addEventListener(moveTrigger,mouseMoveHandler)})
Array('mouseup','touchend').forEach(endTrigger=>{document.addEventListener(endTrigger,()=>{mouseUpHandler()
Array('mousemove','touchmove').forEach(moveTrigger=>{document.removeEventListener(moveTrigger,mouseMoveHandler)})
Array('mouseup','touchend').forEach(moveTrigger=>{document.removeEventListener(moveTrigger,mouseUpHandler)})})})};const htmxFetch=async(url,{method='GET',data}={})=>{try{const response=await fetch(url,{method,headers:{'Content-Type':'application/json','HX-Request':'true','X-CSRFToken':getCookie('csrftoken')},body:JSON.stringify(data)});if(response.ok&&response.status>=200&&response.status<=300){return response}
throw new Error('Response not ok.')}catch(error){console.error('Error:',error)
return null}};const fetchCORSProxy=async(url,fetchParams={})=>{const params={method:'GET',headers:{'HX-Request':'true'}}
if(Object.keys(fetchParams).length>0){params.method='POST'
params.body=JSON.stringify(fetchParams)
params.headers['X-CSRFToken']=getCookie('csrftoken')}
return fetch(`/htmx/cors/proxy/?url=${encodeURIComponent(url)}`,params).then(response=>{if(!response.ok&&(response.status<200||response.status>300)){throw new Error('Response not ok.')}
return response}).catch(error=>{throw error})}
const mapForFetchTimeout=new Map()
const fetchTimeout=async(url,{fetchParams,timeoutMs=60000,controller=new AbortController(),abortBtns,callback=(response)=>response,}={})=>{const mapKey=`${url}_${JSON.stringify(fetchParams)}`
if(mapForFetchTimeout.has(mapKey)){const response=(await mapForFetchTimeout.get(mapKey)).clone()
return callback(response)}
const abortController=()=>controller.abort('Fetch timed out or manually aborted.')
abortBtns?.forEach(btn=>btn.addEventListener('click',abortController))
const timeoutId=setTimeout(abortController,timeoutMs)
const fetchPromise=fetch(url.replaceAll('http:','https:'),{...fetchParams,signal:controller.signal}).then(async response=>{clearTimeout(timeoutId)
if(!response.ok&&(response.status<200||response.status>300)){throw new Error('Response not ok.')}
return response}).catch(async error=>{if(error.name==='TypeError'&&error.message==='Failed to fetch'){return await fetchCORSProxy(url,fetchParams)}else{throw error}}).finally(()=>{setTimeout(()=>mapForFetchTimeout.delete(mapKey),1000)})
mapForFetchTimeout.set(mapKey,fetchPromise)
const response=(await fetchPromise).clone()
return callback(response)}
const mapForParseJSONResponse=new Map()
const parseJSONResponse=async(response,{timeoutMs=60000,}={})=>{if(mapForParseJSONResponse.has(response)){return await mapForParseJSONResponse.get(response)}
const reader=response.body.getReader()
const decoder=new TextDecoder('utf-8')
let result=''
const timeoutPromise=new Promise((resolve,reject)=>{setTimeout(()=>{reject(new Error('Parsing timed out.'))},timeoutMs)});const parsePromise=(async()=>{try{while(true){const{done,value}=await Promise.race([reader.read(),timeoutPromise])
if(done)break
result+=decoder.decode(value,{stream:true})}
return JSON.parse(result)}catch(error){if(error.name==='AbortError'){return}else{throw error}}finally{reader.releaseLock()
setTimeout(()=>mapForParseJSONResponse.delete(response),1000)}})()
mapForParseJSONResponse.set(response,parsePromise)
return parsePromise};const fetchWMSData=async(params,{queryGeom,abortBtns,controller,event}={})=>{const map=event.target
const cleanURL=removeQueryParams(params.url)
const getParams={SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetFeatureInfo',FORMAT:'application/json',INFO_FORMAT:'application/json',TRANSPARENT:true,QUERY_LAYERS:params.name,LAYERS:params.name,exceptions:'application/vnd.ogc.se_inimage',SRS:"EPSG:4326",CRS:'EPSG:4326',BBOX:map.getBounds().toBBoxString(),WIDTH:Math.floor(map.getSize().x),HEIGHT:Math.floor(map.getSize().y),X:Math.floor(event.containerPoint.x),Y:Math.floor(event.containerPoint.y),}
const styles=JSON.parse(params.styles??'{}')
if(Object.keys(styles).length){getParams.STYLES=Object.keys(styles)[0]}
const url=pushQueryParamsToURLString(cleanURL,getParams)
return await fetchTimeout(url,{abortBtns,controller,callback:async(response)=>{const contentType=response.headers.get('Content-Type')
if(contentType.includes('json')){try{return parseJSONResponse(response)}catch{throw new Error('Failed to parse JSON.')}}else if(contentType.includes('xml')){return response.text().then(xmlString=>{const features=[]
const[namespace,rootElement]=parseXML(xmlString)
if(namespace==='http://www.esri.com/wms'){rootElement.childNodes.forEach(child=>{const tagName=child.tagName
if(!tagName||tagName.toLowerCase()!=='fields')return
const attributes=Object.values(child.attributes)
if(attributes.length==0)return
const feature={type:"Feature",properties:{}}
attributes.forEach(attr=>feature.properties[attr.name]=attr.value)
features.push(feature)})}
return geojson=turf.featureCollection(features)})}}}).catch(error=>{console.log(error)})}
const fetchWFSData=async(params,{queryGeom,zoom,abortBtns,controller,event}={})=>{const queryExtent=queryGeom?turf.getType(queryGeom)==='Point'?turf.buffer(queryGeom,leafletZoomToMeter(zoom)/2/1000).geometry:queryGeom:turf.bboxPolygon([-180,-90,180,90]).geometry
const[w,s,e,n]=turf.bbox(queryExtent)
const cleanURL=removeQueryParams(params.url)
const srsname=`urn:ogc:def:crs:EPSG::${params.srid ?? 4326}`
const getParams={service:'WFS',version:'2.0.0',request:'GetFeature',typeNames:params.name,outputFormat:'json',srsname,bbox:[s,w,n,e,srsname]}
const url=pushQueryParamsToURLString(cleanURL,getParams)
return await fetchTimeout(url,{abortBtns,controller,callback:async(response)=>{const contentType=response.headers.get('Content-Type')
if(contentType.includes('json')){try{return parseJSONResponse(response)}catch{throw new Error('Failed to parse JSON.')}}else if(contentType.includes('xml')){return response.text().then(xmlString=>{const features=[]
const[namespace,rootElement]=parseXML(xmlString)
if(namespace==='http://www.esri.com/wms'){rootElement.childNodes.forEach(child=>{const tagName=child.tagName
if(!tagName||tagName.toLowerCase()!=='fields')return
const attributes=Object.values(child.attributes)
if(attributes.length==0)return
const feature={type:"Feature",properties:{}}
attributes.forEach(attr=>feature.properties[attr.name]=attr.value)
features.push(feature)})}
return geojson=turf.featureCollection(features)})}}}).catch(error=>{console.log(error)})}
const fetchGeoJSON=async(params,{abortBtns,controller}={})=>{return await fetchTimeout(params.url,{abortBtns,controller,callback:async(response)=>{try{return parseJSONResponse(response)}catch(error){console.log(error)}}}).catch(error=>{console.log(error)})}
const fetchCSV=async(params,{abortBtns,controller}={})=>{return await fetchTimeout(params.url,{abortBtns,controller,callback:async(response)=>{const csv=await response.text()
return csvToGeoJSON(csv,params)}}).catch(error=>{console.log(error)})}
const fetchGPX=async(params,{abortBtns,controller}={})=>{return await fetchTimeout(params.url,{abortBtns,controller,callback:async(response)=>{const gpx=await response.text()
const dom=(new DOMParser()).parseFromString(gpx,'text/xml')
const geojson=toGeoJSON.gpx(dom)
return geojson}}).catch(error=>{console.log(error)})}
const fetchKML=async(params,{abortBtns,controller}={})=>{return await fetchTimeout(params.url,{abortBtns,controller,callback:async(response)=>{const kml=await response.text()
const dom=(new DOMParser()).parseFromString(kml,'text/xml')
const geojson=toGeoJSON.kml(dom,{styles:true})
return geojson}}).catch(error=>{console.log(error)})}
const rawDataToLayerData=(rawData,params)=>{try{if(params.type==='geojson'){return JSON.parse(rawData)}
if(params.type==='csv'){return csvToGeoJSON(rawData,params)}
if(params.type==='gpx'){const dom=(new DOMParser()).parseFromString(rawData,'text/xml')
return toGeoJSON.gpx(dom)}
if(params.type==='kml'){const dom=(new DOMParser()).parseFromString(rawData,'text/xml')
return toGeoJSON.kml(dom,{styles:true})}
const normalRawData=rawData.toLowerCase()
if(Array(params.format,params.type).some(i=>i==='osm')||Array('openstreetmap','osm').some(i=>normalRawData.includes(i))){return osmDataToGeoJSON(rawData)}}catch(error){console.log(error)}}
const mapForFetchFileData=new Map()
const fetchFileData=async(params,{abortBtns,controller}={})=>{const handler=async(filesArray)=>{const file=filesArray.find(file=>file.name===params.name.replace('.kmz.bin','.kmz'))
if(!file)return
const rawData=await getFileRawData(file)
const data=rawDataToLayerData(rawData,params)
return data}
const url=params.url
const mapKey=`${url};${controller?.id}`
if(mapForFetchFileData.has(mapKey)){return handler(await mapForFetchFileData.get(mapKey))}
const filesArrayPromise=fetchTimeout(url,{abortBtns,controller,callback:async(response)=>{try{const content=await response.blob()
const filesArray=await getValidFilesArray([new File([content],decodeURIComponent(url.split('/')[url.split('/').length-1]))])
return filesArray}catch(error){console.log(error)}},}).catch(error=>{console.log(error.message,params)}).finally(()=>{setTimeout(()=>mapForFetchFileData.delete(mapKey),1000)})
mapForFetchFileData.set(mapKey,filesArrayPromise)
return handler(await filesArrayPromise)};const normalizeGeoJSON=async(geojson,{controller,defaultGeom,}={})=>{if(!geojson)return
let crs
if(geojson.crs){const crsInfo=geojson.crs.properties?.name?.toLowerCase().replace('::',':').split('epsg:')
crs=crsInfo?.length?parseInt(crsInfo[1]):null
delete geojson.crs}
for(const feature of geojson.features){if(controller?.signal.aborted)return
await normalizeGeoJSONFeature(feature,{defaultGeom,crs,})}
return geojson}
const normalizeGeoJSONFeature=async(feature,{defaultGeom,crs,}={})=>{const assignGeom=!feature.geometry&&defaultGeom
if(assignGeom)feature.geometry=defaultGeom
if(crs&&crs!==4326&&!assignGeom){await transformGeoJSONCoordinates(feature.geometry.coordinates,crs,4326)}
feature.properties=normalizeFeatureProperties(feature.properties)
if(feature.id)feature.properties.__source_id__=feature.id
const geomType=feature.geometry.type
feature.properties.__geom_type__=geomType
try{const[x,y]=geomType==='Point'?feature.geometry.coordinates:turf.centroid(feature).geometry.coordinates
feature.properties.__x__=x
feature.properties.__y__=y}catch{}
if(geomType.includes('Polygon')){try{feature.properties.__area_sqm__=turf.area(feature)}catch{}
try{feature.properties.__perimeter_km__=turf.length(turf.polygonToLine(feature))}catch{}}
if(geomType.includes('LineString')){try{feature.properties.__length_km__=turf.length(feature)}catch{}}
if(geomType!=='Point'){try{feature.properties.__bbox_wsen__=turf.bbox(feature).join(', ')}catch{}}
if(!feature.properties.__gsl_id__){feature.properties.__gsl_id__=await hashJSON(feature.properties)}}
const normalizeFeatureProperties=(properties)=>{const normalProperties={}
const handler=(properties)=>{Object.keys(properties).forEach(property=>{const value=properties[property]
if(Array.isArray(value)&&value.every(i=>typeof i!=='object')){normalProperties[property]=value.join(', ')}else if(value&&typeof value==='object'){handler(value)}else{normalProperties[property]=value}})}
handler(properties)
return normalProperties}
const sortGeoJSONFeatures=(geojson,{reverse=false}={})=>{if(!geojson?.features?.length)return
geojson.features.sort((a,b)=>{const featureOrder=["Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon",]
const typeComparison=featureOrder.indexOf(a.geometry.type)-featureOrder.indexOf(b.geometry.type)
const rankComparison=(a.properties.__groupRank__??0)-(b.properties.__groupRank__??0)
const comparison=(typeComparison!==0?typeComparison:rankComparison!==0?rankComparison:(a.properties?.name??'').localeCompare(b.properties?.name??''))
return reverse?-comparison:comparison})}
const transformGeoJSONCoordinates=async(coordinates,source,target)=>{const source_text=`EPSG:${source}`
if(!proj4.defs(source_text))await fetchProj4Def(source)
const target_text=`EPSG:${target}`
if(!proj4.defs(target_text))await fetchProj4Def(target)
if(proj4.defs(source_text)&&proj4.defs(target_text)){loopThroughCoordinates(coordinates,(coords)=>{const projectedCoord=proj4(source_text,target_text,[coords[0],coords[1]])
coords[0]=projectedCoord[0]
coords[1]=projectedCoord[1]})}
return coordinates}
const createAttributionTable=(geojson)=>{if(!geojson||geojson?.type!=='FeatureCollection')return
const info={}
Object.keys(geojson).forEach(key=>{if(!Array('features','type','crs').includes(key)){info[key]=geojson[key]}})
if(Object.keys(info).length){const infoTable=document.createElement('table')
infoTable.className=`table small table-borderless table-sm m-0`
const infoTBody=document.createElement('tbody')
createObjectTRs(info,infoTBody)
infoTable.appendChild(infoTBody)
return infoTable}}
const createGeoJSONChecklist=(geojsonLayer,{controller,}={})=>{const featureLayers=geojsonLayer.getLayers()
if(!featureLayers.length)return
const group=geojsonLayer._group
const listFeatures=featureLayers.length<=100
const disableCheck=featureLayers.length>1000
const container=document.createElement('div')
const pCheckbox=geojsonLayer._checkbox=createFormCheck({parent:container,labelInnerText:`${geojsonLayer._params.title} (${formatNumberWithCommas(featureLayers.length)})`,labelClass:'text-break',formCheckClass:`d-flex gap-2 `,disabled:disableCheck,}).querySelector('input')
const contentCollapse=document.createElement('div')
contentCollapse.id=generateRandomString()
contentCollapse.className=`ps-3 collapse`
container.appendChild(contentCollapse)
if(listFeatures){const featuresContainer=document.createElement('div')
contentCollapse.appendChild(featuresContainer)
for(const featureLayer of featureLayers.reverse()){if(controller?.signal.aborted)return
featureLayer._checkbox=createFormCheck({parent:featuresContainer,labelInnerText:featureLayer._params.title,labelClass:'text-break',formCheckClass:`d-flex gap-2 `,}).querySelector('input')}}
try{for(const layer of Array(geojsonLayer,...featureLayers)){if(controller?.signal.aborted)return
const checkbox=layer._checkbox
layer.on('add remove',(e)=>{const added=e.type==='add'
if(checkbox){if(checkbox.checked===added||pCheckbox.checked===added){checkbox.checked=added}else{checkbox.click()}}else{pCheckbox.checked=added||Array.from(container.querySelectorAll('input.form-check-input')).filter(i=>i!==pCheckbox).some(i=>i.checked)}})
if(!checkbox)continue
checkbox._leafletLayer=layer
const feature=layer.feature
checkbox.addEventListener('click',(e)=>{const isChecked=e.target.checked
isChecked?group.addLayer(layer):group.removeLayer(layer)
if(feature){pCheckbox.checked=isChecked?true:Array.from(container.querySelectorAll('input.form-check-input')).filter(i=>i!==pCheckbox).some(i=>i.checked)
if(!pCheckbox.checked)group.removeLayer(geojsonLayer)}else{layer.eachLayer(f=>isChecked?group.addLayer(f):group.removeLayer(f))}})
const toggleContainer=document.createElement('div')
toggleContainer.className='ms-auto d-flex flex-nowrap gap-2'
checkbox.parentElement.appendChild(toggleContainer)
if(!feature&&typeof layer.getLayers==='function'){const contentToggle=createIcon({parent:toggleContainer,peNone:false,className:'dropdown-toggle ms-5'})
contentToggle.setAttribute('data-bs-toggle','collapse')
contentToggle.setAttribute('data-bs-target',`#${contentCollapse.id}`)
contentToggle.setAttribute('aria-controls',contentCollapse.id)
contentToggle.setAttribute('aria-expanded','false')}
const menuToggle=createIcon({parent:toggleContainer,peNone:false,className:'bi bi-three-dots'})
menuToggle.addEventListener('click',(e)=>{getLeafletLayerContextMenu(e,layer)})}}catch{return}
const infoContainer=document.createElement('div')
infoContainer.className='d-flex'
infoContainer.innerHTML=geojsonLayer._params.attribution??''
contentCollapse.appendChild(infoContainer)
return container}
const createPointCoordinatesTable=(ptFeature,{precision=6}={})=>{const container=document.createElement('div')
container.className=`d-flex flex-nowrap gap-2`
const[lng,lat]=ptFeature.geometry.coordinates
const latDir=lat>=0?'N':'S'
const latDD=`${Math.abs(lat).toFixed(precision)} ${latDir}`
const latDMS=`${ddToDMS(Math.abs(lat)).toString()} ${latDir}`
const lngDir=lng>=0?'E':'W'
const lngDD=`${Math.abs(lng).toFixed(precision)} ${lngDir}`
const lngDMS=`${ddToDMS(Math.abs(lng)).toString()} ${lngDir}`
const coordsFormat=getCookie('coordsFormat')||'DD'
const latSpan=document.createElement('span')
latSpan.innerText=coordsFormat==='DD'?latDD:latDMS
const lngSpan=document.createElement('span')
lngSpan.innerText=coordsFormat==='DD'?lngDD:lngDMS
const copyBtn=createIcon({className:'bi bi-clipboard',peNone:false})
const setCopyBtnTooltip=(copied=false)=>titleToTooltip(copyBtn,`${copied ? 'Copied' : 'Copy'} to clipboard`)
copyBtn.addEventListener('click',()=>{setCopyBtnTooltip(true)
navigator.clipboard.writeText(`${latSpan.innerText} ${lngSpan.innerText}`)})
copyBtn.addEventListener('mouseout',setCopyBtnTooltip)
setCopyBtnTooltip()
container.appendChild(copyBtn)
container.appendChild(latSpan)
container.appendChild(lngSpan)
const formatRadios=createCheckboxOptions({options:{'DD':{checked:coordsFormat==='DD'?true:false,labelAttrs:{'data-bs-title':'Decimal Degrees',},},'DMS':{checked:coordsFormat==='DMS'?true:false,labelAttrs:{'data-bs-title':'Degrees, minutes, seconds',},},},type:'radio',containerClass:'ms-auto flex-nowrap gap-2',})
formatRadios.querySelectorAll('.form-check').forEach(formCheck=>{const label=formCheck.querySelector('label')
label.setAttribute('data-bs-toggle','tooltip')
new bootstrap.Tooltip(label)
const input=formCheck.querySelector('input')
input.addEventListener('click',()=>{const innerText=label.innerText
setCookie('coordsFormat',innerText)
if(innerText==='DD'){latSpan.innerText=latDD
lngSpan.innerText=lngDD}
if(innerText==='DMS'){latSpan.innerText=latDMS
lngSpan.innerText=lngDMS}})})
container.appendChild(formatRadios)
return container}
const createFeaturePropertiesTable=(properties,{header,}={})=>{const table=document.createElement('table')
table.className=removeWhitespace(`
        table table-sm table-striped
    `)
if(header){const thead=document.createElement('thead')
table.appendChild(thead)
const theadtr=document.createElement('tr')
thead.appendChild(theadtr)
const theadth=document.createElement('th')
theadth.setAttribute('scope','col')
theadth.setAttribute('colspan','2')
theadth.className='fw-medium text-break text-wrap'
theadth.innerText=header
theadtr.appendChild(theadth)}
const tbody=document.createElement('tbody')
table.appendChild(tbody)
Object.keys(properties).forEach(property=>{const data=properties[property]??null
const tr=document.createElement('tr')
tbody.appendChild(tr)
const key=document.createElement('td')
key.className='fw-medium pe-3'
key.innerText=property
key.setAttribute('scope','row')
tr.appendChild(key)
const value=document.createElement('td')
value.className='text-wrap'
value.innerHTML=data
tr.appendChild(value)})
return table}
const fetchGeoJSONHandlers=(name)=>{return{osm:fetchOSMData,nominatim:fetchNominatim,overpass:fetchOverpass,geojson:fetchGeoJSON,file:fetchFileData,csv:fetchCSV,gpx:fetchGPX,kml:fetchKML,'ogc-wms':fetchWMSData,'ogc-wfs':fetchWFSData,}[name]}
const staticVectorFormats=['local','file','geojson','csv','gpx','kml','osm',]
const mapForGetGeoJSON=new Map()
const getGeoJSON=async(dbKey,{queryGeom,zoom=20,controller,abortBtns,sort=false,event,}={})=>{if(!dbKey)return
const bbox=queryGeom?turf.bbox(queryGeom).join(','):null
const mapKey=[dbKey,bbox,controller?.id].join(';')
if(mapForGetGeoJSON.has(mapKey)){const data=await mapForGetGeoJSON.get(mapKey)
if(controller?.signal.aborted)return
return data}
const dataPromise=(async()=>{try{const[handlerName,handlerParams]=dbKey.split(';',2)
const isLocal=handlerName==='local'
const isStatic=staticVectorFormats.includes(handlerName)
const queryExtent=queryGeom?turf.getType(queryGeom)==='Point'?turf.buffer(queryGeom,leafletZoomToMeter(zoom)/2/1000).geometry:queryGeom:null
let geojson
geojson=await(async()=>{if(controller?.signal.aborted)return
const cachedData=await getFromGISDB(dbKey)
if(!cachedData){if(isLocal){return new Error('Stored data not found.')}else{return}}
const cachedGeoJSON=cachedData.gisData
const cachedQueryExtent=cachedData.queryExtent
if(queryExtent&&cachedGeoJSON.features.length){if(isStatic){if(!turf.booleanIntersects(queryExtent,cachedQueryExtent))return turf.featureCollection([])}else{try{const equalBounds=turf.booleanEqual(queryExtent,cachedQueryExtent)
const withinBounds=turf.booleanWithin(queryExtent,cachedQueryExtent)
if(!equalBounds&&!withinBounds)return}catch(error){return}}
cachedGeoJSON.features=cachedGeoJSON.features.filter(feature=>{if(controller?.signal?.aborted)return
let intersects
try{intersects=turf.booleanIntersects(queryExtent,feature)}catch(error){intersects=turf.booleanIntersects(queryExtent,turf.envelope(feature))}
return intersects})}
return cachedGeoJSON})()
if(!isLocal&&((isStatic&&!geojson)||(!isStatic&&!geojson?.features?.length))){geojson=await(async()=>{if(controller?.signal.aborted)return
const params=JSON.parse(handlerParams)
const geojson=await fetchGeoJSONHandlers(handlerName)(...Object.values(params),{queryGeom,zoom,controller,abortBtns,event,})
if(!geojson)return new Error('No geojson retrieved.')
if(geojson.features?.length){if(controller?.signal.aborted)return
await normalizeGeoJSON(geojson,{defaultGeom:queryGeom.geometry,controller,abortBtns})
if(controller?.signal.aborted)return
if(!Array('nominatim','ogc-wms').includes(handlerName)){await updateGISDB(dbKey,turf.clone(geojson),isStatic?turf.bboxPolygon(turf.bbox(geojson)).geometry:queryExtent,)}
if(isStatic){geojson.features=geojson.features.filter(feature=>{if(controller?.signal?.aborted)return
return turf.booleanIntersects(queryExtent,feature)})}}
return geojson})()}
if(geojson?.features?.length&&sort){sortGeoJSONFeatures(geojson,{reverse:true})}
return geojson}catch(error){return error}finally{setTimeout(()=>mapForGetGeoJSON.delete(mapKey),1000);}})()
mapForGetGeoJSON.set(mapKey,dataPromise)
const data=await dataPromise
if(controller?.signal.aborted)return
return data}
const downloadGeoJSON=(geojson,fileName)=>{if(!geojson)return
const geojsonStr=typeof geojson==='string'?geojson:JSON.stringify(geojson)
const blob=new Blob([geojsonStr],{type:'application/json'})
const url=URL.createObjectURL(blob)
const a=document.createElement('a')
a.href=url
a.download=`${fileName}.geojson`
a.click()
URL.revokeObjectURL(url)}
const validateGeoJSONFeature=(feature,filters)=>{if(filters.type.active&&!filters.type.values[feature.geometry.type])return false
if(filters.properties.active){const operator=filters.properties.operator
const propertyFilters=Object.values(filters.properties.values).filter(i=>i.active&&i.property&&i.values?.length)
const evaluate=(i)=>{const handler=relationHandlers(i.handler)
if(!handler)return true
const value=(()=>{const value=removeWhitespace(String(feature.properties[i.property]??'[undefined]'))
return value===''?'[blank]':value})()
try{return i.values.some(v=>handler(value,v,{caseSensitive:i.case})===i.value)}catch(error){return!i.value}}
if(operator==='&&'&&!propertyFilters.every(i=>evaluate(i)))return false
if(operator==='||'&&!propertyFilters.some(i=>evaluate(i)))return false}
if(filters.geom.active){const operator=filters.geom.operator
const geomFilters=Object.values(filters.geom.values).filter(i=>i.active&&i.geoms?.length&&i.geoms.every(g=>turf.booleanValid(g)))
const evaluate=(i)=>{const handler=turf[i.handler]
if(!handler)return true
try{return i.geoms.some(g=>handler(feature.geometry,g)===i.value)}catch{return!i.value}}
if(operator==='&&'&&!geomFilters.every(i=>evaluate(i)))return false
if(operator==='||'&&!geomFilters.some(i=>evaluate(i)))return false}
return true}
const csvToGeoJSON=(csv,params)=>{const xField=params.xField?.trim()
const yField=params.yField?.trim()
const srid=parseInt(params.srid??4326)
const parsedCSV=Papa.parse(csv,{header:true})
const features=[]
for(const data of parsedCSV.data){if(Object.keys(data).length!==parsedCSV.meta.fields.length)continue
const lon=parseFloat(data[xField])
const lat=parseFloat(data[yField])
if(isNaN(lon)||isNaN(lat))continue
const feature=turf.point([lon,lat],data)
features.push(feature)}
geojson=turf.featureCollection(features)
if(srid!==4326){geojson.crs={properties:{name:`EPSG::${srid}`}}}
return geojson}
const simplifyFeature=(feature,{maxPts,tolerance=0.001,mutate=false,highQuality=false,maxTolerance=1,}={})=>{try{maxPts=!isNaN(maxPts)?Number(maxPts):null
if(maxPts&&turf.coordAll(feature).length<=maxPts){return feature}
const type=turf.getType(feature)
const options={tolerance,mutate,highQuality}
let simpleFeature=turf.simplify(feature,options)
if(maxPts&&((type.includes('Polygon')&&maxPts>2)||((type.includes('LineString')&&maxPts>1)))){options.tolerance+=0.001
while(turf.coordAll(simpleFeature).length>maxPts&&options.tolerance<=maxTolerance){simpleFeature=turf.simplify(feature,options)
options.tolerance+=0.001}}
return simpleFeature}catch(error){console.log(error)}}
const osmDataToGeoJSON=(data)=>{let parsedData
try{parsedData=JSON.parse(data)}catch{const parser=new DOMParser()
parsedData=parser.parseFromString(data,"text/xml")}
if(!parsedData)return
return osmtogeojson(parsedData)}
const explodeFeature=(feature,{}={})=>{}
const featuresIntersect=(feature1,feature2)=>{let intersects=false
try{intersects=turf.booleanIntersects(feature1,feature2)}catch{try{intersects=turf.booleanIntersects(feature1,turf.envelope(feature2))}catch{try{intersects=turf.booleanIntersects(turf.envelope(feature1),feature2)}catch{intersects=turf.booleanIntersects(turf.envelope(feature1),turf.envelope(feature2))}}}
return intersects};const requestGISDB=()=>{const request=indexedDB.open('GISDB',1)
request.onupgradeneeded=(e)=>{const db=e.target.result
if(!db.objectStoreNames.contains('gis')){db.createObjectStore('gis',{keyPath:'id'})}}
return request}
const getAllGISDBKeys=async()=>{return new Promise(async(resolve,reject)=>{const request=requestGISDB()
request.onsuccess=(e)=>{const db=e.target.result
const transaction=db.transaction(['gis'],'readonly')
const objectStore=transaction.objectStore('gis')
const keysRequest=objectStore.getAllKeys()
keysRequest.onsuccess=()=>resolve(keysRequest.result)
keysRequest.onerror=()=>resolve([])}
request.onerror=(e)=>resolve([])})}
const createLocalLayerDBKey=({id=generateRandomString(64),name='new layer',version=1}={})=>{const params=canonicalize({id,name})
return`local;${params}--version${version}`}
const saveToGISDB=async(gisData,{id,name,queryExtent,expirationDays=7,}={})=>{if(!gisData)return
if(!id){const currentIds=await getAllGISDBKeys()
while(!id||currentIds.includes(id)){id=createLocalLayerDBKey({name})}}
if(!queryExtent&&gisData.type==='FeatureCollection'){queryExtent=turf.bboxPolygon(turf.bbox(gisData)).geometry}
const expirationTime=Date.now()+(expirationDays*1000*60*60*24)
const request=requestGISDB()
request.onsuccess=async(e)=>{const db=e.target.result
const transaction=db.transaction(['gis'],'readwrite')
const objectStore=transaction.objectStore('gis')
objectStore.put({id,gisData,queryExtent,expirationTime})}
return id}
const updateGISDB=async(id,newGISData,newQueryExtent)=>{return new Promise(async(resolve,reject)=>{const save=async(data)=>{const{gisData,queryExtent}=data
if(data)await saveToGISDB(gisData,{id,queryExtent})
resolve(id)}
const cachedData=await getFromGISDB(id,{save:false})
if(!cachedData){await save({gisData:newGISData,queryExtent:newQueryExtent,})}else{const worker=new Worker('/static/helpers/gis/js/workers/indexdb-update.js')
worker.postMessage({newGISData,newQueryExtent,currentGISData:cachedData.gisData,currentQueryExtent:cachedData.queryExtent,})
worker.onmessage=async(e)=>{await save(e.data)
worker.terminate()}
worker.onerror=(error)=>{worker.terminate()
reject()}}})}
const getFromGISDB=async(id,{save=true}={})=>{return new Promise((resolve,reject)=>{const request=requestGISDB()
request.onsuccess=(e)=>{const db=e.target.result
const transaction=db.transaction(['gis'],'readonly')
const objectStore=transaction.objectStore('gis')
const gisDataRequest=objectStore.get(id)
gisDataRequest.onsuccess=async(e)=>{const result=e.target.result
if(!result)return resolve(null)
const{gisData,queryExtent}=result
if(save)await saveToGISDB(gisData,{id,queryExtent})
resolve({gisData:structuredClone(gisData),queryExtent})}
gisDataRequest.onerror=(e)=>{reject(e.target.errorCode)}}
request.onerror=(e)=>{reject(e.target.errorCode)}})}
const deleteFromGISDB=(id)=>{const request=requestGISDB()
request.onsuccess=(e)=>{const db=e.target.result
const transaction=db.transaction(['gis'],'readwrite')
const objectStore=transaction.objectStore('gis')
const deleteRequest=objectStore.delete(id)
deleteRequest.onsuccess=()=>{}
deleteRequest.onerror=(e)=>{}}
request.onerror=(e)=>{}}
const clearGISDB=()=>{const request=requestGISDB()
request.onsuccess=(e)=>{const db=e.target.result
const transaction=db.transaction(['gis'],'readwrite')
const objectStore=transaction.objectStore('gis')
const clearRequest=objectStore.clear();clearRequest.onsuccess=function(){}
clearRequest.onerror=function(event){}}
request.onerror=(e)=>{}}
const getAllGISDBData=async({keys=[]}={})=>{return new Promise((resolve,reject)=>{const request=requestGISDB()
request.onsuccess=(e)=>{const db=e.target.result
const transaction=db.transaction(['gis'],'readonly')
const objectStore=transaction.objectStore('gis')
const gisDataRequest=objectStore.getAll()
gisDataRequest.onsuccess=async(e)=>{const result=keys.length?gisDataRequest.result.filter(i=>keys.includes(i.id)):gisDataRequest.result
resolve(result)}
gisDataRequest.onerror=(e)=>{reject(e.target.errorCode)}}
request.onerror=(e)=>{reject(e.target.errorCode)}})}
const fetchProj4Def=async(crs,{abortBtns,controller,}={})=>{for(const url of[`/htmx/srs/wkt/${crs}/`,`https://spatialreference.org/ref/epsg/${crs}/ogcwkt`,]){const def=await fetchTimeout(url,{abortBtns,controller,callback:async(response)=>{const def=await response.text()
const crs_text=`EPSG:${crs}`
proj4.defs(crs_text,def)
return proj4.defs(crs_text)},fetchParams:{headers:{'HX-Request':'true'}}}).catch(error=>{console.error(error)})
if(def)return def}};const ddToDMS=(decimalDegrees,precision=2)=>{let degrees=Math.floor(Math.abs(decimalDegrees))
let minutesFloat=(Math.abs(decimalDegrees)-degrees)*60
let minutes=Math.floor(minutesFloat)
let seconds=(minutesFloat-minutes)*60
seconds=parseFloat(seconds.toFixed(precision))
return{degrees:degrees,minutes:minutes,seconds:seconds,toString:()=>`${degrees}°${minutes}'${seconds}"`}}
const loopThroughCoordinates=(coordinates,handler)=>{if(Object.keys(coordinates).every(key=>Array('lat','lng').includes(key))){handler(coordinates)}else if(Array.isArray(coordinates)&&coordinates.length===2&&coordinates.every(item=>typeof item==='number')){handler(coordinates)}else{Object.values(coordinates).forEach(value=>loopThroughCoordinates(value,handler))}
return coordinates}
const isBbox=(value)=>/^\[\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*\]$/.test(value);const findLayersPanels=(container,{}={})=>{const id=`${container.id}-panels`
const[toggle,offcanvas]=createOffcanvas(id,{themed:true,toggleiconSpecs:'bi-info-circle',toggleLabelText:'Geopanel',toggleLabelClass:'d-none d-md-block',show:getCookie(`show_#${id}`)==='true',offcanvasClass:'offcanvas-end',offcanvasToggleIcon:'bi-layout-sidebar-inset-reverse',titleClass:'h6',toggleBtns:[createButton({className:'bi bi-plus-square border-0 bg-transparent fs-16 p-0 text-muted ms-3',attrs:{type:'button',title:'Add layers','data-bs-toggle':"modal",'data-bs-target':"#addLayersModal",},}),createButton({className:'bi bi-save border-0 bg-transparent fs-16 p-0 text-muted ms-3',attrs:{type:'button',title:'Export layers','data-bs-toggle':"modal",'data-bs-target':"#exportLayersModal",},}),]})
offcanvas.style.minWidth='200px'
const[tabs,accordion]=createAccordion(`${id}-accordion`,{'legend':{label:`Legend`,active:true,},'style':{label:`Properties`,},'query':{label:`Query`,},'toolbox':{label:`Toolbox`,},},{themed:true})
offcanvas.querySelector('.offcanvas-nav').appendChild(tabs)
offcanvas.querySelector('.offcanvas-body').appendChild(accordion)
return[toggle,offcanvas]};const fetchNominatim=async({queryGeom,zoom,abortBtns,controller,}={})=>{const[lon,lat]=turf.centroid(queryGeom).geometry.coordinates
const url=pushURLParams('https://nominatim.openstreetmap.org/reverse?',{lat,lon,zoom,format:'geojson',polygon_geojson:1,polygon_threshold:0,})
return await fetchTimeout(url,{abortBtns,controller,callback:parseJSONResponse}).catch(error=>{console.log(error)})}
const cleanOverpassTags=(tags)=>{if(tags==='')return tags
if(!tags.includes('[')||!tags.includes(']')){tags=tags.startsWith('[')?tags:`[${tags}`
tags=tags.endsWith(']')?tags:`${tags}]`}
if(!tags.includes('"')){tags=tags.split(/([\[\]=~]|, ?i)/).filter(Boolean)
tags=tags.map(i=>{i=i.trim()
if(['[',']','=','~',',i'].includes(i))return i
if([', i'].includes(i))return i.replace(' ','')
i=i.startsWith('"')?i:`"${i}`
i=i.endsWith('"')?i:`${i}"`
return i})
tags=tags.join('')}
return tags}
const ALL_OVERPASS_ELEMENT_TYPES=['node','way','relation']
const getOverpassQueryBlock=(queryGeom,{zoom=5,types=ALL_OVERPASS_ELEMENT_TYPES,tags='',}={})=>{let params
if(turf.getType(queryGeom)==='Point'){const[lon,lat]=turf.centroid(queryGeom).geometry.coordinates
const buffer=leafletZoomToMeter(zoom)/2
params=`around:${buffer},${lat},${lon}`}else{const[w,s,e,n]=turf.bbox(queryGeom)
params=s+','+w+','+n+','+e}
const query=`(
        ${types.map(type => `${type}${cleanOverpassTags(tags)}(${params});`).join('')}
    );`
return query}
const mapForFetchOverpass=new Map()
let fetchOverpassIsActive=false
const fetchOverpass=async(params,{queryGeom,zoom,abortBtns,controller,query=getOverpassQueryBlock(queryGeom,{zoom,...params}),}={})=>{const url='https://overpass-api.de/api/interpreter'
const body="data="+encodeURIComponent(`[out:json][timeout:${60*10}];${query}out tags geom body;`)
console.log(Array(url,body).join('?'))
const mapKey=canonicalize({body,controller:controller?.id})
if(mapForFetchOverpass.has(mapKey)){return mapForFetchOverpass.get(mapKey)}
while(fetchOverpassIsActive&&!controller?.signal.aborted){await new Promise(res=>setTimeout(res,1000))}
if(controller?.signal.aborted)return
fetchOverpassIsActive=true
console.log(Array(url,body).join('?'))
const fetchPromise=fetchTimeout(url,{abortBtns,controller,callback:async(response)=>{const data=await parseJSONResponse(response)
return data?osmtogeojson(data):null},fetchParams:{method:"POST",body,}}).catch(error=>{console.log('Failed to fetch OSM data from Overpass API.')}).finally(()=>{fetchOverpassIsActive=false
setTimeout(()=>mapForFetchOverpass.delete(mapKey),1000)})
mapForFetchOverpass.set(mapKey,fetchPromise)
return fetchPromise}
const overpassToGeoJSON=async(data,{controller,properties={},}={})=>{const geojson=turf.featureCollection([])
for(const key in properties)geojson[key]=properties[key]
for(const element of data){if(controller?.signal?.aborted)return
const id=element.id
const type=element.type
const tags=element.tags||{}
const feature=turf.feature(geom=null,properties={...tags,osm_id:id,osm_type:type,})
if(type==='relation'){const points=[]
const polygons=[]
const linestrings=[]
element.members.forEach(member=>{const memberType=member.type
if(memberType==='node'){points.push(member)}else if(member.geometry){const firstCoords=member.geometry[0]
const lastCoords=member.geometry[member.geometry.length-1]
if(firstCoords.lat===lastCoords.lat&&firstCoords.lon===lastCoords.lon){polygons.push(member)}else{linestrings.push(member)}}})
if(points.length){const featureMpt=turf.clone(feature)
featureMpt.geometry={type:'MultiPoint',coordinates:points.map(point=>[parseFloat(point.lon),parseFloat(point.lat)])}
geojson.features.push(featureMpt)}
if(linestrings.length){const featureMls=turf.clone(feature)
featureMls.geometry={type:'MultiLineString',coordinates:linestrings.map(line=>line.geometry.map(coords=>[parseFloat(coords.lon),parseFloat(coords.lat)]))}
geojson.features.push(featureMls)}
if(polygons.length){const outerGeoms=[]
const innerGeoms=[]
polygons.forEach(polygon=>{const polygonGeom=polygon.geometry.map(coords=>[parseFloat(coords.lon),parseFloat(coords.lat)])
if(polygon.role==='inner'){innerGeoms.push(polygonGeom)}else{outerGeoms.push(polygonGeom)}})
const featureMp=turf.clone(feature)
featureMp.geometry={type:'MultiPolygon',coordinates:[outerGeoms,innerGeoms].filter(i=>i.length)}
geojson.features.push(featureMp)}}else{if(type==='node'){feature.geometry={type:'Point',coordinates:[parseFloat(element.lon),parseFloat(element.lat)]}}
if(type==='way'){const firstCoords=element.geometry[0]
const lastCoords=element.geometry[element.geometry.length-1]
const featureType=firstCoords.lat===lastCoords.lat&&firstCoords.lon===lastCoords.lon?'Polygon':'LineString'
const coordinates=element.geometry.map(coords=>[parseFloat(coords.lon),parseFloat(coords.lat)])
feature.geometry={type:featureType,coordinates:featureType==='Polygon'?[coordinates]:coordinates}}
geojson.features.push(feature)}}
return geojson}
const fetchOSMData=async(params,{abortBtns,controller}={})=>{return await fetchTimeout(params.url,{abortBtns,controller,callback:async(response)=>{const data=await response.text()
return osmDataToGeoJSON(data)}}).catch(error=>{console.log(error)})};document.addEventListener('DOMContentLoaded',()=>{const modalElement=document.querySelector(`#addLayersModal`)
const modalInstance=bootstrap.Modal.getOrCreateInstance(modalElement)
const formId='addLayersForm'
const form=modalElement.querySelector(`#${formId}`)
const sourceRadios=Array.from(form.elements.source)
const fileInput=form.elements.files
const mapInput=form.elements.map
const fileFields=form.querySelector(`#${formId}-fileFields`)
const urlFields=form.querySelector(`#${formId}-urlFields`)
const gslFields=form.querySelector(`#${formId}-gslFields`)
const resetBtn=form.elements.reset
const vectorBtn=form.elements.vector
const submitBtn=form.elements.submit
let map
modalElement.addEventListener('show.bs.modal',(e)=>{map=getLeafletMap(e.relatedTarget.closest('.leaflet-container').id)})
const getLayerNamesContainer=(source)=>form.querySelector(`#${formId}-${source}-layerNames`)
const getFileSource=()=>sourceRadios.find(i=>i.checked).value
const toggleSubmitBtn=()=>{const container=getLayerNamesContainer(getFileSource())
const checkedLayer=Array.from(container.querySelectorAll('.form-check-input')).find(i=>i.checked)
submitBtn.disabled=checkedLayer?false:true}
const resetLayerNames=(source)=>{getLayerNamesContainer(source).innerHTML=''
toggleSubmitBtn()}
const resetFormatField=()=>{const formatField=form.elements.format
formatField.value=''
formatField.classList.remove('is-invalid')
formatField.disabled=true
resetLayerNames('url')}
const resetUrlFields=()=>{const urlField=form.elements.url
urlField.value=''
urlField.classList.remove('is-invalid')
resetFormatField()}
const resetForm=(e)=>{fileInput.value=''
mapInput.value=''
resetLayerNames('files')
resetLayerNames('gsl')
resetUrlFields()
toggleSubmitBtn()}
const getIncludedLayers=(source)=>{const container=getLayerNamesContainer(source)
const layerCheckboxes=Array.from(container.querySelectorAll('.form-check-input')).slice(1)
const includedLayers={}
layerCheckboxes.forEach(i=>{if(!i.checked)return
const params={}
Array.from(i.parentElement.querySelectorAll('input')).forEach(j=>{if(i===j)return
const name=j.getAttribute('name')
if(!name)return
params[name]=j.value})
includedLayers[i.value]=params})
return includedLayers}
form.addEventListener('submit',(e)=>e.preventDefault())
submitBtn.addEventListener('click',async(e)=>{const group=map._handlers.getLayerGroups().local
const source=getFileSource()
const includedLayers=getIncludedLayers(source)
if(source==='gsl'){try{const rawData=await getFileRawData(mapInput.files[0])
const layers=compressJSON.decompress(JSON.parse(rawData))
for(i in includedLayers){const layer=layers[i]
layer.params.title=includedLayers[i].title
includedLayers[i]=layer}
const newIndexedDBKeys={}
const sortedLayers=Object.values(includedLayers).sort((a,b)=>Number(a.zIndex)-Number(b.zIndex))
for(const i of sortedLayers){const currentKey=i.indexedDBKey
if(currentKey.startsWith('local')){if(!Object.keys(newIndexedDBKeys).includes(currentKey)){newIndexedDBKeys[currentKey]=createLocalLayerDBKey({name:i.params.name})}
i.indexedDBKey=newIndexedDBKeys[currentKey]}
await map._handlers.addLegendLayer(i)}}catch(error){console.log(error)}}
if(source==='files'){const filesArray=await getValidFilesArray(fileInput.files)
for(const file of filesArray){if(!Object.keys(includedLayers).includes(file.name))continue
const params=includedLayers[file.name]
fileToLeafletLayer({file,group,add:true,filesArray,params,})}}
if(source==='url'){const url=form.elements.url.value
const format=form.elements.format.value
for(const name in includedLayers){const params={...includedLayers[name],url,format,name}
urlToLeafletLayer({group,add:true,params,})}
const element=getLayerNamesContainer(source).querySelector('[hx-trigger="update-collection"')
if(element&&Object.values(includedLayers).some(i=>Object.keys(i).some(j=>{if(j==='title')return false
let field=form.elements[j]
field=field.length?Array.from(field)[0]:field
if(field.hidden)return false
return i[j]!==''}))){try{const vals={...JSON.parse(element.getAttribute('hx-vals')),layers:includedLayers,}
element.setAttribute('hx-vals',JSON.stringify(vals))
const event=new Event("update-collection",{bubbles:true})
element.dispatchEvent(event)}catch(error){console.log(error)}}}
resetForm()
modalInstance.hide()})
vectorBtn.addEventListener('click',async(e)=>{const group=map._handlers.getLayerGroups().local
const layer=await getLeafletGeoJSONLayer({geojson:turf.featureCollection([]),pane:createCustomPane(map),group,params:{name:'new layer'}})
if(layer)group.addLayer(layer)
resetForm()
modalInstance.hide()})
resetBtn.addEventListener('click',resetForm)
sourceRadios.forEach(radio=>{radio.addEventListener('click',()=>{const source=getFileSource()
fileFields.classList.toggle('d-none',source!=='files')
getLayerNamesContainer('files').classList.toggle('d-none',source!=='files')
urlFields.classList.toggle('d-none',source!=='url')
getLayerNamesContainer('url').classList.toggle('d-none',source!=='url')
gslFields.classList.toggle('d-none',source!=='gsl')
getLayerNamesContainer('gsl').classList.toggle('d-none',source!=='gsl')
toggleSubmitBtn()})})
fileInput.addEventListener('change',async(e)=>{if(!fileInput.files.length)return resetLayerNames('files')
const layerNames=(await getValidFilesArray(fileInput.files)).map(i=>i.name)
fileInput.setAttribute('hx-vals',JSON.stringify({'layerNames':JSON.stringify(layerNames)}))
const event=new Event("get-file-forms",{bubbles:true})
fileInput.dispatchEvent(event)})
mapInput.addEventListener('change',async(e)=>{if(!mapInput.files.length)return resetLayerNames('gsl')
const container=getLayerNamesContainer('gsl')
container.innerHTML=getSpinnerHTML({text:'Fetching layers...'})
try{const rawData=await getFileRawData(mapInput.files[0])
const layers=compressJSON.decompress(JSON.parse(rawData))
handleGSLLayers(layers,container)}catch(error){console.log(error)
container.innerHTML=''}
toggleSubmitBtn()})
form.addEventListener('click',(e)=>{if(!e.target.matches(`.form-check-input[type="checkbox"]`))return
const[selectAllCheckbox,...layerCheckboxes]=Array.from(getLayerNamesContainer(getFileSource()).querySelectorAll(`.form-check-input[type="checkbox"]`))
if(e.target===selectAllCheckbox){layerCheckboxes.forEach(i=>i.checked=e.target.checked)}else{selectAllCheckbox.checked=layerCheckboxes.every(i=>i.checked)}
toggleSubmitBtn()})
form.addEventListener('htmx:configRequest',(e)=>{if(e.target===form.elements.format){e.detail.parameters['url']=form.elements.url.value}})
form.addEventListener('htmx:beforeRequest',async(e)=>{if(e.target===form.elements.url){try{resetFormatField()
getLayerNamesContainer('url').innerHTML=getSpinnerHTML({text:'Fetching layers...'})
return new URL(e.target.value)}catch{resetUrlFields()}}
if(e.target===form.elements.format){resetLayerNames('url')
getLayerNamesContainer('url').innerHTML=getSpinnerHTML({text:'Fetching layers...'})
return}
if(e.target===fileInput&&e.target.files.length)return
if(e.target.matches(`[hx-trigger="update-collection"]`))return
e.preventDefault()
toggleSubmitBtn()})
form.addEventListener('htmx:beforeSwap',(e)=>{if(e.target.id===`${formId}-urlFields`){getLayerNamesContainer('url').innerHTML=''}})
form.addEventListener('htmx:afterSwap',(e)=>{toggleSubmitBtn()})
form.addEventListener('htmx:responseError',(e)=>{if(e.detail.pathInfo.requestPath!=='/htmx/collection/validate/')return
e.target.classList.add('is-invalid')
if(e.target.name==='url'){e.target.nextElementSibling.querySelector('ul').innerText='Unable to inspect URL content.'
resetFormatField()}
if(e.target.name==='format'){e.target.nextElementSibling.querySelector('ul').innerText='Unable to retrieve layers.'
resetUrlFields()}})});const handleGSLLayers=(layers,container)=>{container.innerHTML=''
if(!Object.keys(layers).length)return
const selectAllDiv=customCreateElement({parent:container,className:`d-flex gap-2 align-items-center sticky-top text-bg-${getPreferredTheme()} pt-2`})
const selectAllCheckbox=customCreateElement({parent:selectAllDiv,tag:'input',className:'form-check-input mt-0',attrs:{type:'checkbox',value:'all',checked:true,},})
const selectAllLabel=customCreateElement({parent:selectAllDiv,tag:'input',className:'form-control border-0 box-shadow-none',attrs:{readonly:true,value:`Select all layers (${Object.keys(layers).length})`},})
const layersContainer=customCreateElement({parent:container,className:'d-flex flex-column gap-2',})
Object.keys(layers).reverse().forEach(i=>{const data=layers[i]
const layerContainer=customCreateElement({parent:layersContainer,className:'d-flex align-items-center'})
const checkbox=customCreateElement({parent:layerContainer,tag:'input',className:'form-check-input mt-0',attrs:{type:'checkbox',value:i,checked:true,}})
const titleField=createFormFloating({parent:layerContainer,containerClass:'flex-grow-1 ms-2 w-50',fieldAttrs:{type:'text',name:'title',title:data.params.name,value:data.params.title,},labelText:'Title',events:{change:(e)=>{const value=e.target.value.trim()
if(value){layers[i].params.title=value}}}})})}
document.addEventListener('DOMContentLoaded',()=>{const modalElement=document.querySelector(`#exportLayersModal`)
const modalInstance=bootstrap.Modal.getOrCreateInstance(modalElement)
const form=modalElement.querySelector(`#exportLayersForm`)
const resetBtn=form.elements.reset
const submitBtn=form.elements.submit
const modalBody=modalElement.querySelector('.modal-body')
let map
modalElement.addEventListener('show.bs.modal',(e)=>{map=getLeafletMap(e.relatedTarget.closest('.leaflet-container').id)})
let layers
const resetLayers=async()=>{modalBody.innerHTML=getSpinnerHTML({text:'Fetching layers...'})
layers=JSON.parse(localStorage.getItem(`legend-layers-${map.getContainer().id}`??'{}'))
if(layers){for(const layer of Object.values(layers)){let currentKey=layer.indexedDBKey
if(!currentKey.startsWith('local'))continue
if(layer.editable){layer.editable=false
const[id,version]=currentKey.split('--version')
currentKey=`${id}--version${Number(version ?? 2)-1}`}
layer.indexedDBKey=currentKey
layer.data=await getFromGISDB(currentKey)}
handleGSLLayers(layers,modalBody)}else{modalBody.innerHTML=`<div class="d-flex justify-content-center m-3"><span>No layers found.</span></div>`}
toggleSubmitBtn()}
const toggleSubmitBtn=()=>{const checkedLayer=Array.from(modalBody.querySelectorAll('.form-check-input')).find(i=>i.checked)
submitBtn.disabled=checkedLayer?false:true}
modalElement.addEventListener('show.bs.modal',async()=>resetLayers())
resetBtn.addEventListener('click',(e)=>resetLayers())
submitBtn.addEventListener('click',(e)=>{let filteredLayers=structuredClone(layers)
const[selectAllCheckbox,...layerCheckboxes]=Array.from(modalBody.querySelectorAll(`.form-check-input[type="checkbox"]`))
if(!selectAllCheckbox.checked){layerCheckboxes.forEach(i=>{if(!i.checked)delete filteredLayers[i.value]})}
const data=JSON.stringify(compressJSON.compress(filteredLayers))
const blob=new Blob([data],{type:'application/json'})
const url=URL.createObjectURL(blob)
const a=document.createElement('a')
a.href=url
a.download=`map.gsl`
a.click()
URL.revokeObjectURL(url)})
form.addEventListener('click',(e)=>{if(!e.target.matches(`.form-check-input[type="checkbox"]`))return
const[selectAllCheckbox,...layerCheckboxes]=Array.from(modalBody.querySelectorAll(`.form-check-input[type="checkbox"]`))
if(e.target===selectAllCheckbox){layerCheckboxes.forEach(i=>i.checked=e.target.checked)}else{selectAllCheckbox.checked=layerCheckboxes.every(i=>i.checked)}
toggleSubmitBtn()})});const leafletZoomToMeter=(zoom)=>{const values={20:10,19:20,18:30,17:50,16:100,15:300,14:500,13:1000,12:2000,11:5000,10:10000,9:20000,8:30000,7:50000,6:100000,5:300000,4:500000,3:1000000,2:3000000,1:5000000,}
return zoom?values[zoom]:values}
const isLeafletControlElement=(element)=>{return element.classList.contains('leaflet-control')||element.closest('.leaflet-control')}
const createCustomPane=(map)=>{if(!map)return
const paneName=`custom-${generateRandomString()}`
map.getPane(paneName)||map.createPane(paneName)
return paneName}
const deletePane=(map,paneName)=>{const pane=map.getPane(paneName)
if(!pane)return
L.DomUtil.remove(pane)
delete map._panes[paneName]
delete map._paneRenderers[paneName]};const getLeafletGeoJSONLayer=async({geojson,group,pane='overlayPane',indexedDBKey,properties={},customStyleParams={},params={},}={})=>{const geojsonLayer=L.geoJSON(turf.featureCollection([]),{pane,renderer:new L.SVG({pane}),markersInheritOptions:true,})
geojsonLayer._group=group
geojsonLayer._renderers=[geojsonLayer.options.renderer,new L.Canvas({pane})]
params.name=params.name??params.title
params.title=params.title??params.name
geojsonLayer._params=params
properties=geojsonLayer._properties=properties??{}
properties.info=properties.info??{showLegend:true,showAttribution:true,tooltip:{active:true,properties:[],delimiter:'; ',prefix:'',suffix:'',},popup:{active:true,properties:[],},}
properties.symbology=properties.symbology??{default:{active:true,label:'',rank:1,showCount:true,showLabel:true,styleParams:getLeafletStyleParams(customStyleParams),},case:false,method:'single',groupBy:[],}
properties.visibility=properties.visibility??{active:false,min:10,max:5000000,}
properties.limits=properties.limits??{active:true,max:1000,method:'limit'}
properties.transformations=properties.transformations??{simplify:{active:false,scale:{active:false,min:10,max:5000000,},values:{'None':{active:true,fn:null,},'Centroid':{active:false,fn:'centroid',},'Bounding box':{active:false,fn:'envelope',},'Simplify by tolerance':{active:false,fn:'simplify',options:{tolerance:0,}},}},}
properties.filters=properties.filters??{type:{active:false,values:{Point:true,MultiPoint:true,LineString:true,MultiLineString:true,Polygon:true,MultiPolygon:true,}},geom:{active:false,values:{},operator:'&&',},properties:{active:false,values:{},operator:'&&',},}
geojsonLayer._selectedFeatures=[]
geojsonLayer._handlers={getFeatureStyleParams:(feature)=>{const symbology=geojsonLayer._properties?.symbology
return(symbology?.groups)?.[feature.properties.__groupId__]?.styleParams||symbology?.default?.styleParams||getLeafletStyleParams()},isPatternFilledPolygonInCanvas:(feature)=>{const styleParams=geojsonLayer._handlers.getFeatureStyleParams(feature)
return(geojsonLayer.options.renderer instanceof L.Canvas&&turf.getType(feature).endsWith('Polygon')&&styleParams.fillPattern==='icon'&&document.querySelector(`#${styleParams.fillPatternId}-img`)?.getAttribute('src'))},selectFeatureLayer:(layer,{updated=false}={})=>{const feature=layer.feature
const gslId=feature.properties.__gsl_id__
if(geojsonLayer._selectedFeatures.includes(gslId)&&!updated)return
const handler=feature.geometry.type.includes('Point')?'setIcon':'setStyle'
const styleParams=geojsonLayer._handlers.getFeatureStyleParams(feature)
const iconType=styleParams.iconType
const style=getLeafletLayerStyle(feature,{...styleParams,strokeColor:'hsla(53, 100%, 54%, 1.00)',strokeWidth:3,...(Array('emoji').includes(iconType)?{textShadow:'yellow 3px 3px 6px'}:{}),},{renderer:geojsonLayer.options.renderer})
if(Array('img','svg','html').includes(iconType)){const el=customCreateElement({innerHTML:style.options.html}).firstChild
if(el){el.style.border='3px solid yellow'
style.options.html=el}}
layer[handler](style)
if(!geojsonLayer._selectedFeatures.includes(gslId)){geojsonLayer._selectedFeatures.push(gslId)}},deselectFeatureLayer:(layer)=>{const feature=layer.feature
const gslId=feature.properties.__gsl_id__
if(!geojsonLayer._selectedFeatures.includes(gslId))return
const handler=feature.geometry.type.includes('Point')?'setIcon':'setStyle'
layer[handler](getLeafletLayerStyle(feature,{...geojsonLayer._handlers.getFeatureStyleParams(feature),},{renderer:geojsonLayer.options.renderer}))
geojsonLayer._selectedFeatures=geojsonLayer._selectedFeatures.filter(i=>i!==gslId)},}
geojsonLayer.options.onEachFeature=(feature,layer)=>{const gslId=feature.properties.__gsl_id__
const styleParams=geojsonLayer._handlers.getFeatureStyleParams(feature)
const handler=(layer)=>{layer._params=layer._params??{}
layer.options.pane=geojsonLayer.options.pane
const isMapDrawControlLayer=group._name==='local'&&geojsonLayer._indexedDBKey===group._map._drawControl?._targetLayer?._indexedDBKey
const properties=feature.properties
const info=geojsonLayer._properties.info
info.attributes=Array.from(new Set([...Object.keys(properties),...(info.attributes??[])]))
const tooltip=info.tooltip
layer._params.title=tooltip.properties.length?(()=>{const values=tooltip.properties.map(i=>{let value=properties[i]
if(!isNaN(value))return formatNumberWithCommas(Number(value))
value=value??'null'
return String(value)})
return values.some(i=>i!=='null')?[tooltip.prefix??'',values.join(tooltip.delimiter),tooltip.suffix??''].join(' ').trim():null})():getFeatureTitle(properties)
if(tooltip.active&&layer._params.title)layer.bindTooltip(layer._params.title,{sticky:true})
const popup=info.popup
if(popup.active||isMapDrawControlLayer){let popupProperties={}
if(popup.properties.length&&!isMapDrawControlLayer){for(const i of popup.properties){popupProperties[i]=properties[i]}}else{popupProperties=properties}
const getPopupHeader=()=>[geojsonLayer,layer].map(i=>i._params.title).filter(i=>i).join(': ').trim()
const content=createFeaturePropertiesTable(popupProperties,{header:getPopupHeader()})
if(isMapDrawControlLayer){content.classList.remove('table-striped')
const toggleSaveBtn=()=>{const rows=Array.from(content.querySelectorAll('tbody tr'))
const hasChangedField=rows.find(row=>{if(!row.querySelector('input'))return
const nameChanged=row.firstChild.firstChild.value.trim()!==row.firstChild.firstChild.getAttribute('placeholder')
const valueChanged=row.firstChild.nextElementSibling.firstChild.value.trim()!==row.firstChild.nextElementSibling.firstChild.getAttribute('placeholder')
return nameChanged||valueChanged||!row.lastChild.firstChild.checked})
const allValidNames=rows.every(row=>!row.lastChild.firstChild.checked||row.firstChild.firstChild.value.trim()!=='')
const names=rows.filter(row=>row.lastChild.firstChild.checked).map(row=>row.firstChild.firstChild.value.trim())
const allUniqueNames=new Set(names).size===names.length
enable=hasChangedField&&allValidNames&&allUniqueNames
saveBtn.classList.toggle('disabled',!enable)}
const checkPropertyNameDuplicate=(e)=>{const duplicate=Array.from(content.querySelectorAll('tbody tr')).filter(row=>row.firstChild.firstChild.value===e.target.value)
if(duplicate.length>1){e.target.classList.add('bg-danger')
e.target.setAttribute('title','Duplicate property name')}else{e.target.classList.remove('bg-danger')
e.target.removeAttribute('title')}}
Array.from(content.querySelectorAll('tbody tr')).forEach(row=>{const propertyName=row.firstChild.innerText
if(propertyName.startsWith('__')&&propertyName.endsWith('__'))return
const propertyValue=row.firstChild.nextElementSibling.innerText
Array.from(row.children).forEach(i=>i.innerHTML='')
const nameField=customCreateElement({parent:row.firstChild,tag:'input',className:'border-0 p-0 m-0',attrs:{type:'text',value:propertyName,placeholder:propertyName},style:{width:'100px'},events:{change:(e)=>{if(e.target.value===''){e.target.value=propertyName}
checkPropertyNameDuplicate(e)
toggleSaveBtn()}}})
const valueField=customCreateElement({parent:row.firstChild.nextElementSibling,tag:'input',className:'border-0 p-0 m-0',attrs:{type:'text',value:propertyValue,placeholder:propertyValue},style:{width:'100px'},events:{change:(e)=>toggleSaveBtn()}})
const td=customCreateElement({parent:row,tag:'td',})
const checkbox=customCreateElement({parent:td,tag:'input',attrs:{type:'checkbox'},events:{click:(e)=>toggleSaveBtn()}}).checked=true})
const tfoot=customCreateElement({parent:content,tag:'tfoot',})
const tfoottr=customCreateElement({parent:tfoot,tag:'tr',})
const tfootth=customCreateElement({parent:tfoottr,tag:'th',attrs:{scope:'col',colspan:'3'},style:{borderBottomWidth:'0px'}})
const tfootdiv=customCreateElement({parent:tfootth,className:'d-flex justify-content-between gap-5'})
const addBtn=customCreateElement({parent:tfootdiv,tag:'button',className:'btn btn-primary btn-sm badge',innerHTML:'Add',events:{click:(e)=>{const tr=customCreateElement({parent:content.querySelector('tbody'),tag:'tr'})
const nameTd=customCreateElement({parent:tr,tag:'td'})
const nameField=customCreateElement({parent:nameTd,tag:'input',className:'border-0 p-0 m-0',attrs:{type:'text',value:'',placeholder:''},style:{width:'100px'},events:{change:(e)=>{checkPropertyNameDuplicate(e)
toggleSaveBtn()}}})
const valueTd=customCreateElement({parent:tr,tag:'td'})
const valueField=customCreateElement({parent:valueTd,tag:'input',className:'border-0 p-0 m-0',attrs:{type:'text',value:'',placeholder:''},style:{width:'100px'},events:{change:(e)=>toggleSaveBtn()}})
const td=customCreateElement({parent:tr,tag:'td',})
const checkbox=customCreateElement({parent:td,tag:'input',attrs:{type:'checkbox'},events:{click:(e)=>toggleSaveBtn()}}).checked=true}}})
const saveBtn=customCreateElement({parent:tfootdiv,tag:'button',className:'btn btn-success btn-sm badge disabled',innerHTML:'Save',events:{click:async(e)=>{const newProperties={}
Array.from(content.querySelectorAll('tbody tr')).forEach(row=>{if(row.lastChild.firstChild.checked){const propertyName=row.firstChild.firstChild.value.trim()
const propertyValue=row.firstChild.nextElementSibling.firstChild.value.trim()
newProperties[propertyName]=propertyValue}})
layer.closePopup()
let newFeature=structuredClone(feature)
newFeature.properties=newProperties
newFeature=(await normalizeGeoJSON(turf.featureCollection([newFeature]))).features[0]
const{gisData,queryExtent}=await getFromGISDB(geojsonLayer._indexedDBKey)
gisData.features=[...gisData.features.filter(i=>i.properties.__gsl_id__!==gslId),newFeature]
await saveToGISDB(turf.clone(gisData),{id:geojsonLayer._indexedDBKey,queryExtent:turf.bboxPolygon(turf.bbox(gisData)).geometry})
group.getLayers().forEach(i=>{if(i._indexedDBKey!==geojsonLayer._indexedDBKey)return
updateLeafletGeoJSONLayer(i,{geojson:gisData,updateLocalStorage:false})})
group._map._drawControl._addChange({type:'edited',features:[{old:feature,new:newFeature}]})}}})}
layer.bindPopup(content,{autoPan:false,maxHeight:300})
layer.on('popupopen',()=>layer._popup._contentNode.querySelector('th').innerText=getPopupHeader())}
layer.on('contextmenu',(e)=>getLeafletLayerContextMenu(e.originalEvent,layer))
if(gslId&&(geojsonLayer._measuredFeatures??[]).includes(gslId)){layer.options.showMeasurements=true}
if(gslId&&(geojsonLayer._selectedFeatures??[]).includes(gslId)){geojsonLayer._handlers.selectFeatureLayer(layer,{updated:true})}
const selectFeature=group._map._featureSelectorLayer.getLayers()[0]?.feature
if(selectFeature&&selectFeature.properties.done){const select=selectFeature.properties.select
if((select&&geojsonLayer._selectedFeatures.includes(gslId))||(!select&&!geojsonLayer._selectedFeatures.includes(gslId)))return
if(!featuresIntersect(selectFeature,feature))return
select?geojsonLayer._handlers.selectFeatureLayer(layer,{updated:true}):geojsonLayer._handlers.deselectFeatureLayer(layer)}}
if(geojsonLayer._handlers.isPatternFilledPolygonInCanvas(feature)){layer.once('add',()=>{geojsonLayer.removeLayer(layer)
const poly=L.polygon(layer.getLatLngs(),getLeafletLayerStyle(feature,styleParams,{renderer:geojsonLayer.options.renderer}))
poly.feature=feature
handler(poly)
poly.addTo(geojsonLayer)})}else{handler(layer)}}
geojsonLayer.options.style=(feature)=>{const styleParams=geojsonLayer._handlers.getFeatureStyleParams(feature)
if(geojsonLayer._handlers.isPatternFilledPolygonInCanvas(feature))return
return getLeafletLayerStyle(feature,styleParams,{renderer:geojsonLayer.options.renderer})}
geojsonLayer.options.pointToLayer=(feature,latlng)=>{const styleParams=geojsonLayer._handlers.getFeatureStyleParams(feature)
const icon=getLeafletLayerStyle(feature,styleParams,{renderer:geojsonLayer.options.renderer})
const pane=geojsonLayer.options.pane
return icon instanceof L.DivIcon?L.marker(latlng,{icon,pane}):L.circleMarker(latlng,{...icon,pane})}
if(geojson){if(geojson.type==='Feature')geojson=turf.featureCollection([geojson])
await normalizeGeoJSON(geojson)}
if(group._map._legendLayerGroups.includes(group)){geojsonLayer._indexedDBKey=geojson?await saveToGISDB(geojson,{...(indexedDBKey?{id:indexedDBKey}:{name:geojsonLayer._params.name})}):indexedDBKey
geojsonLayer.on('popupopen',(e)=>geojsonLayer._openpopup=e.popup)
geojsonLayer.on('popupclose',(e)=>delete geojsonLayer._openpopup)
geojsonLayer.on('add',()=>updateLeafletGeoJSONLayer(geojsonLayer,{geojson:(geojsonLayer.getLayers().length&&geojsonLayer!==geojsonLayer._group?._map?._drawControl?._targetLayer&&geojsonLayer._previousVersion===geojsonLayer._indexedDBKey&&turf.booleanEqual(geojsonLayer._previousBbox.geometry,geojsonLayer._group._map._previousBbox.geometry)?geojsonLayer.toGeoJSON():null),updateLocalStorage:false}))
if(!params?.bbox&&geojson?.features.length){geojsonLayer._params.bbox=JSON.stringify(turf.bbox(geojson))}}else if(geojson){geojsonLayer.addData(geojson)}
return geojsonLayer}
const getFeatureTitle=(properties)=>{let title
for(const key of['name:en','name','display','title','id',]){const matches=Object.keys(properties).filter(i=>i===key||i.includes(key))
if(!matches.length){continue}else{title=String(properties[matches[0]])
break}}
if(!title){for(const key in properties){const value=properties[key]
if(value.length>64)continue
title=`${key}: ${value}`
break}}
return title}
const getLeafletGeoJSONData=async(layer,{geojson,controller,abortBtns,filter=true,queryGeom=false,group=false,sort=false,transform=false,event,}={})=>{if(!layer)return
const indexedDBKey=layer._indexedDBKey
if(!indexedDBKey)return
const map=layer._map??layer._group?._map
if(!map)return
const isEditable=layer._indexedDBKey===layer._map._drawControl?._targetLayer?._indexedDBKey
queryGeom=isEditable?false:queryGeom===true?turf.bboxPolygon(getLeafletMapBbox(map)).geometry:queryGeom
if(geojson?.features?.length&&queryGeom){const queryExtent=turf.getType(queryGeom)==='Point'?turf.buffer(queryGeom,leafletZoomToMeter(zoom)/2/1000).geometry:queryGeom
geojson.features=geojson.features.filter(feature=>{if(controller?.signal?.aborted)return
return turf.booleanIntersects(queryExtent,feature)})}
let data=geojson??(await getGeoJSON(indexedDBKey,{queryGeom,zoom:map.getZoom(),controller,abortBtns,event,}))
if(!data)return
if(controller?.signal.aborted)return
if(data instanceof Error){layer.fire('dataerror')
return}
data=turf.clone(data)
if(data.features?.length){const filters=layer._properties.filters
const hasActiveFilters=filter&&Object.values(filters).some(i=>{if(!i.active)return false
return Object.values(i.values).some(j=>{return!j.hasOwnProperty('active')||j.active})})
const groups=Object.entries((layer._properties.symbology.groups??{})).sort(([keyA,valueA],[keyB,valueB])=>{return valueA.rank-valueB.rank})
const hasActiveGroups=group&&groups.some(i=>i[1].active)
if(hasActiveFilters||hasActiveGroups){data.features=data.features.filter(feature=>{if(controller?.signal?.aborted)return
const valid=hasActiveFilters?validateGeoJSONFeature(feature,filters):true
if(valid){const properties=feature.properties
properties.__groupId__=''
properties.__groupRank__=groups.length+1
if(hasActiveGroups){for(const[id,group]of groups){if(controller?.signal?.aborted)break
if(!group.active||!validateGeoJSONFeature(feature,group.filters??{}))continue
properties.__groupId__=id
properties.__groupRank__=group.rank
break}}}
return valid})}
if(transform){const transformations=layer._properties.transformations
const simplifyParams=transformations.simplify
const simplifyFn=Object.values(simplifyParams.values).find(i=>i.active&&i.fn&&(i.fn!=='simplify'||i.options.tolerance>0))
const simplifyScale=simplifyParams.scale
const mapScale=getLeafletMeterScale(map)
if(simplifyParams.active&&simplifyFn&&(!simplifyScale.active||(mapScale<=simplifyScale.max&&mapScale>=simplifyScale.min))){layer._properties.transformations.simplify.inEffect=true
data.features=data.features.map(feature=>{if(turf.getType(feature)==='Point')return feature
let newFeature
try{newFeature=turf[simplifyFn.fn](feature,{...(simplifyFn.options??{})})
newFeature.properties=feature.properties}catch{newFeature=feature}
return newFeature})}else{layer._properties.transformations.simplify.inEffect=false}}
if(sort){if(controller?.signal?.aborted)return
sortGeoJSONFeatures(data,{reverse:true})}}
return data}
const isUnderenderedLayer=(layer)=>{return layer._group._map._handlers.hasHiddenLegendLayer(layer)||layer._group._map._handlers.hasHiddenLegendGroupLayer(layer)||!leafletLayerIsVisible(layer)}
const updateLeafletGeoJSONLayer=async(layer,{geojson,controller,abortBtns,updateLocalStorage=true}={})=>{if(!layer||!layer._map||isUnderenderedLayer(layer))return
const map=layer._map??layer._group?._map
if(!map)return
const isEditable=layer._indexedDBKey===map._drawControl?._targetLayer?._indexedDBKey
layer.fire('dataupdating')
const data=await getLeafletGeoJSONData(layer,{geojson,controller,abortBtns,group:true,sort:true,queryGeom:!isEditable,filter:!isEditable,transform:!isEditable,})
if(!data)return
if(controller?.signal?.aborted)return
const limits=layer._properties.limits
limits.totalCount=data?.features?.length
if(!isEditable&&limits.active&&limits.totalCount>limits.max){if(limits.method==='limit'){data.features=data.features.slice(-limits.max)}else{let nextZoom=map.getZoom()+1
if(limits.method==='zoomin'&&nextZoom<=20){map.setZoom(nextZoom)}
if(limits.method==='scale'){const currentScale=getLeafletMeterScale(map)
let minScale=currentScale
while(minScale>=currentScale){minScale=leafletZoomToMeter(nextZoom)
nextZoom+=1}
const maxScale=layer._properties.visibility.min
layer._properties.visibility.max=maxScale>minScale?maxScale:minScale
layer._properties.visibility.active=true
updateLeafletGeoJSONLayer(layer,{geojson,controller,abortBtns,updateLocalStorage})
const event=new Event("change",{bubbles:true})
const mapContainer=map.getContainer()
mapContainer.querySelector(`#${mapContainer.id}-panels-style-body`).parentElement.firstChild.querySelector('select').dispatchEvent(event)}
return}}
const renderer=data?.features?.length>1000?L.Canvas:L.SVG
if(!(layer.options.renderer instanceof renderer)){layer.options.renderer._container?.classList.add('d-none')
layer.options.renderer=layer._renderers.find(r=>{return r instanceof renderer})}
layer.options.renderer._container?.classList.remove('d-none')
layer.clearLayers()
layer.addData(data)
layer._previousBbox=turf.bboxPolygon(getLeafletMapBbox(map))
layer._previousVersion=layer._indexedDBKey
layer.fire('dataupdate')
if(updateLocalStorage)map._handlers.updateStoredLegendLayers({layer})}
const getGeoJSONLayerStyles=(layer)=>{const symbology=layer._properties.symbology
const styles={}
Array(...Object.keys(symbology.groups??{}),'').forEach(id=>{const origStyle=symbology.groups?.[id]||symbology.default
if(!origStyle.active)return
const style=styles[id]={...origStyle,types:{}}
let typeNames
const styleTypeFilter=style.filters?.type
if(styleTypeFilter?.active){typeNames=[...new Set(Object.keys(styleTypeFilter.values).filter(i=>{return styleTypeFilter.values[i]}))]}else{const layerTypeFilter=layer._properties.filters.type
if(layerTypeFilter.active){typeNames=[...new Set(Object.keys(layerTypeFilter.values).filter(i=>{return layerTypeFilter.values[i]}))]}}
typeNames=typeNames?.map(i=>i.toLowerCase().replaceAll('multi',''))||Array('point','linestring','polygon')
const styleParams=style.styleParams
typeNames.forEach(typeName=>{style.types[typeName]={count:0,html:leafletLayerStyleToHTML(getLeafletLayerStyle({properties:styleParams.iconType==='property'?styleParams.iconSpecs.reduce((acc,key)=>{acc[key]=key
return acc},{}):{},geometry:{type:typeName}},{...styleParams,iconOffset:'0,0'},{forLegend:true}),typeName)}})})
layer.eachLayer(featureLayer=>{const feature=featureLayer.feature
const featureType=feature.geometry.type.toLowerCase()
const groupId=feature.properties.__groupId__??""
const style=styles[groupId]??styles['']
if(featureType==='geometrycollection'){feature.geometry.geometries.forEach(i=>style.types[i.type.toLowerCase().split('multi').splice(-1)].count+=1)}else{style.types[featureType.split('multi').splice(-1)].count+=1}})
Object.keys(styles).forEach(i=>{const style=styles[i]
const totalCount=Object.values(style.types).map(type=>type.count||0).reduce((a,b)=>a+b,0)
i===''&&totalCount===0&&Object.keys(styles).length>1?delete styles[i]:style.totalCount=totalCount})
const typesString=[...new Set(Object.values(styles).map(i=>Object.keys(i.types).filter(j=>i.types[j].count>0).join(',')))]
if(typesString.length===1&&typesString[0]!==''){const types=typesString[0].split(',')
Object.keys(styles).forEach(i=>{const style=styles[i]
Object.keys(style.types).forEach(j=>{if(!types.includes(j)&&!style.types[j].count)delete style.types[j]})})}
return styles}
const createGeoJSONLayerLegend=(layer,parent)=>{const table=document.createElement('table')
table.id=`${parent.id}-table`
table.className=removeWhitespace(`
        table table-sm table-borderless
        table-${getPreferredTheme()}
        align-middle m-0
    `)
parent.appendChild(table)
const tbody=document.createElement('tbody')
table.appendChild(tbody)
const styles=Object.entries(getGeoJSONLayerStyles(layer)).sort(([keyA,valueA],[keyB,valueB])=>{return valueA.rank-valueB.rank})
if(!styles.reduce((acc,num)=>acc+num[1].totalCount,0)){return}
for(const[id,style]of styles){const tr=document.createElement('tr')
tr.id=`${table.id}-${id}`
tr.className='d-flex flex-nowrap align-items-center'
tbody.appendChild(tr)
const icon=document.createElement('td')
icon.id=`${tr.id}-icon`
icon.className='d-flex flex-no-wrap gap-2 align-items-center justify-content-center bg-transparent'
tr.appendChild(icon)
const totalCount=formatNumberWithCommas(style.totalCount)
const label=document.createElement('td')
label.className='bg-transparent'
tr.appendChild(label)
const labelContent=document.createElement('p')
labelContent.className='m-0 ms-1 text-wrap gap-1'
labelContent.appendChild(createSpan(style.label?`${style.label} `:'',{id:`${tr.id}-title`,className:`user-select-none ${!style.showLabel ? 'd-none' : ''}`}))
labelContent.appendChild(createSpan(`(${totalCount})`,{id:`${tr.id}-count`,className:`user-select-none ${!style.showCount ? 'd-none' : ''}`}))
label.appendChild(labelContent)
for(const type in style.types){const typeCount=style.types[type].count
const typeIcon=document.createElement('div')
typeIcon.id=`${icon.id}-${type}`
typeIcon.className='d-flex align-items-center justify-content-center'
const isPoint=type==='point'
typeIcon.style[isPoint?'minHeight':'height']='14px'
if(!isPoint)typeIcon.style['width']='20px'
typeIcon.innerHTML=style.types[type].html
titleToTooltip(typeIcon,`${formatNumberWithCommas(typeCount)} ${type}${typeCount > 1 ? 's' : ''}`)
icon.appendChild(typeIcon)}}
const pointIcons=Array.from(tbody.querySelectorAll('tr')).map(i=>{return i.querySelector(`#${i.firstChild.id}-point`)}).filter(i=>i)
const maxWidth=Math.max(...pointIcons.map(i=>{const clone=i.cloneNode(true)
if(clone){clone.className='position-absolute'
if(clone.firstChild?.style){clone.firstChild.style.maxWidth=''}}
document.body.appendChild(clone)
const width=clone.offsetWidth
clone.remove()
return width}))
pointIcons.forEach(i=>i.style.width=`${maxWidth}px`)};const handleLeafletZoombar=(map,{include=true}={})=>{if(!include)return map.removeControl(map.zoomControl)
const container=map.zoomControl.getContainer()
container.classList.add('border-0','shadow-lg')
const defaultClass=['border-0','d-flex','justify-content-center','align-items-center']
const buttonClass={_zoomInButton:{icon:createIcon({className:'bi bi-plus-lg'}),class:defaultClass.concat(['rounded-top','rounded-bottom-0'])},_zoomOutButton:{icon:createIcon({className:'bi bi-dash-lg'}),class:defaultClass.concat(['rounded-bottom','rounded-top-0'])},}
for(const buttonName in buttonClass){const data=buttonClass[buttonName]
const button=map.zoomControl[buttonName]
button.innerHTML=data.icon.outerHTML
button.classList.add(...data.class)}}
const handleLeafletScaleBar=(map,{include=true}={})=>{if(!include)return
const scaleBar=L.control.scale({position:'bottomright'}).addTo(map)
map._scaleBar=scaleBar}
const handleLeafletSearchBar=(map,{include=true}={})=>{if(!include||!L.Control.geocoder)return
const geocoder=L.Control.geocoder({defaultMarkGeocode:false,position:'topleft',}).on('markgeocode',(e)=>{var bbox=e.geocode.bbox;var poly=L.polygon([bbox.getSouthEast(),bbox.getNorthEast(),bbox.getNorthWest(),bbox.getSouthWest()]);map.fitBounds(poly.getBounds());}).addTo(map);const geocoderContainer=geocoder.getContainer()
const topLeftContainer=map._controlCorners.topleft
if(topLeftContainer.firstChild!==geocoderContainer){topLeftContainer.insertBefore(geocoderContainer,topLeftContainer.firstChild);}
const button=geocoderContainer.querySelector('button')
button.innerText=''
button.innerHTML=createIcon({className:'bi bi-binoculars-fill'}).outerHTML
const geocoderFieldsSelector=map.getContainer().parentElement.dataset.mapGeocoderFields
if(geocoderFieldsSelector){document.addEventListener('change',(event)=>{if(!event.target.matches(geocoderFieldsSelector))return
const place=event.target.value
if(place==='')return
geocoder.setQuery(place)
geocoder._geocode()})
geocoder.on('markgeocode',(e)=>{const geocoderFields=document.querySelectorAll(geocoderFieldsSelector)
geocoderFields.forEach(field=>{if(field.value.toLowerCase()===e.target._lastGeocode.toLowerCase()){field.value=e.geocode.name}})})}
document.addEventListener('keydown',(e)=>{if(e.altKey&&e.key==='a'){L.DomEvent.preventDefault(e)
geocoder.getContainer().firstChild.click()}})}
const handleLeafletRestViewBtn=(map,{include=true}={})=>{const resetViewControl=map.resetviewControl
if(!include)return map.removeControl(resetViewControl)
const container=resetViewControl.getContainer()
const control=container.querySelector('a')
control.innerHTML=createIcon({className:'bi bi-globe-americas'}).outerHTML
resetViewControl._defaultBounds=L.latLngBounds(L.latLng(-80,-220),L.latLng(85,220))
resetViewControl.getBounds=()=>resetViewControl._defaultBounds
control.addEventListener('click',()=>{map._viewReset=true})
document.addEventListener('keydown',(e)=>{if(e.altKey&&e.key==='s'){L.DomEvent.preventDefault(e)
control.click()}})}
const handleLeafletLocateBtn=(map,{include=true}={})=>{if(!include)return
const locateControl=L.control.locate({position:'topleft',setView:'untilPanOrZoom',cacheLocation:true,locateOptions:{maxZoom:18},strings:{title:"Zoom to my location (alt+d)"},showPopup:false,drawCircle:false,}).addTo(map);document.addEventListener('keydown',(e)=>{if(e.altKey&&e.key==='d'){L.DomEvent.preventDefault(e)
locateControl._link.click()}})}
const handleLeafletMeasureTool=(map,{include=true}={})=>{if(!include)return
const measureControl=new L.Control.LinearMeasurement({position:'topleft',unitSystem:'metric',color:'#0d6efd',type:'line'}).addTo(map)
const icon=measureControl._container.querySelector('.icon-ruler')
icon.classList.add('bi','bi-rulers')}
const leafletControls={zoom:handleLeafletZoombar,scale:handleLeafletScaleBar,search:handleLeafletSearchBar,reset:handleLeafletRestViewBtn,locate:handleLeafletLocateBtn,measure:handleLeafletMeasureTool,}
const handleLeafletMapControls=async(map)=>{const container=map.getContainer()
const dataset=container.parentElement.dataset
const includedControls=dataset.mapControlsIncluded
const excludedControls=dataset.mapControlsExcluded
Object.keys(leafletControls).forEach(controlName=>{const excluded=excludedControls&&(excludedControls.includes(controlName)||excludedControls==='all')
const included=!includedControls||includedControls.includes(controlName)||includedControls==='all'
leafletControls[controlName](map,{include:(included&&!excluded)})})
applyThemeToLeafletControls(container)
toggleMapInteractivity(map)}
const applyThemeToLeafletControls=(container)=>{const themeClass=[`text-bg-${getPreferredTheme()}`,'text-reset']
container.querySelectorAll('.leaflet-control').forEach(control=>{Array.from(control.children).forEach(child=>child.classList.add(...themeClass))})
container.querySelectorAll(removeWhitespace(`
        .leaflet-control-attribution,
        .leaflet-control-geocoder
    `)).forEach(element=>element.classList.add(...themeClass))}
const toggleMapInteractivity=(map,{controls=Array.from(map.getContainer().querySelectorAll('.leaflet-control'))}={})=>{controls.forEach(control=>{Array.from(control.children).forEach(child=>{Array('mouseover','touchstart','touchmove','wheel').forEach(trigger=>{child.addEventListener(trigger,(e)=>{disableMapInteractivity(map)})})
Array('mouseout','touchend').forEach(trigger=>{child.addEventListener(trigger,(e)=>{enableMapInteractivity(map)})})})})};const handleLeafletDrawBtns=(map,{include=true,targetLayer=L.geoJSON(),}={})=>{const drawControlChangesKey=`draw-control-changes-${map.getContainer().id}`
if(map._drawControl){map.removeControl(map._drawControl)
delete map._drawControl
localStorage.removeItem(drawControlChangesKey)}
if(!include)return
const styleParams=getLeafletStyleParams({fillColor:'hsla(60, 100%, 50%, 1)',strokeWidth:3})
const drawControl=map._drawControl=new L.Control.Draw({position:'topleft',draw:{polyline:{shapeOptions:getLeafletLayerStyle({geometry:{type:'polyline'}},styleParams)},polygon:{allowIntersection:false,drawError:{color:'#b700ffff',message:'<strong>Oh snap!<strong> you can\'t draw that!'},shapeOptions:getLeafletLayerStyle({geometry:{type:'polygon'}},styleParams)},rectangle:{shapeOptions:getLeafletLayerStyle({geometry:{type:'polygon'}},styleParams)},marker:{icon:getLeafletLayerStyle({geometry:{type:'point'}},styleParams,{allowCircleMarker:false})},circle:false,circlemarker:false,},edit:{featureGroup:L.geoJSON(),remove:false,}})
drawControl._targetLayer=targetLayer
drawControl._addChange=async(data)=>{if(!data)return
try{const changes=JSON.parse(localStorage.getItem(drawControlChangesKey)??'[]')
changes.push(data)
localStorage.setItem(drawControlChangesKey,JSON.stringify(changes))}catch(error){const alertPromise=new Promise((resolve,reject)=>{const alert=createModal({titleText:'Change will not be backed up.',parent:document.body,show:true,static:true,closeBtn:false,centered:true,contentBody:customCreateElement({className:'p-3',innerHTML:`Recent change will not be backed up and therefore cannot be undone later via the <b>Undo</b> button. Do you want to keep the change or undo it now?`}),footerBtns:{undo:createButton({className:`btn-secondary ms-auto`,innerText:'Undo',attrs:{'data-bs-dismiss':'modal'},events:{click:(e)=>{alert?.remove()
resolve(false)}},}),keep:createButton({className:`btn-success`,innerText:'Keep',attrs:{'data-bs-dismiss':'modal'},events:{click:(e)=>{alert?.remove()
resolve(true)}},}),}})})
const keepChange=await alertPromise
if(!keepChange)undoLastChange({lastChange:data})}}
const container=drawControl.addTo(map)._container
toggleMapInteractivity(map,{controls:[container]})
drawControl._toggleFeatureEdit=({feature}={})=>{const editableLayer=drawControl.options.edit.featureGroup
const editBtn=drawControl._toolbars.edit._modes.edit.button
if(feature){const layer=L.geoJSON(feature).getLayers()[0]
layer.addTo(editableLayer)
editableLayer.addTo(map)
removeTooltip(editBtn)
editBtn.classList.remove('text-secondary')
editBtn.click()}else{editableLayer.clearLayers()
editableLayer.removeFrom(map)
editBtn.classList.add('text-secondary')
titleToTooltip(editBtn,'Right-click on a feature and select <b>Edit geometry</b> to edit.')}}
drawControl._toggleFeatureEdit()
drawControl._explodeFeatureGeometry=async(feature)=>{try{let newGeoJSON=turf.featureCollection([feature])
for(const handler of Array('flatten','unkinkPolygon')){newGeoJSON=turf[handler](newGeoJSON)}
const newFeatures=(await normalizeGeoJSON(newGeoJSON)).features
if(newFeatures.length>1){for(const index in newFeatures){const properties=newFeatures[index].properties
const prefix=`explode_index`
let propKey=`__${prefix}__`
let count=0
while(Object.keys(properties).includes(propKey)){count+=1
propKey=`__${prefix}_${count}__`}
properties[`${propKey}`]=index
properties[`__exploded_feature${count ? `_${count}` : ''}__`]=properties.__gsl_id__
delete properties.__gsl_id__
newFeatures[index].properties.__gsl_id__=await hashJSON(properties)}}
const{gisData,queryExtent}=await getFromGISDB(targetLayer._indexedDBKey)
gisData.features=[...gisData.features.filter(i=>i.properties.__gsl_id__!==feature.properties.__gsl_id__),...newFeatures]
await saveToGISDB(turf.clone(gisData),{id:targetLayer._indexedDBKey,queryExtent:turf.bboxPolygon(turf.bbox(gisData)).geometry})
targetLayer._group.getLayers().forEach(i=>{if(i._indexedDBKey!==targetLayer._indexedDBKey)return
updateLeafletGeoJSONLayer(i,{geojson:gisData,updateLocalStorage:false})})
drawControl._addChange({type:'edited',features:newFeatures.map(i=>{return{new:i,old:feature}})})}catch(error){console.log(error)}}
const section=customCreateElement({parent:container,className:'leaflet-draw-section'})
const bar=customCreateElement({parent:section,className:'leaflet-draw-toolbar leaflet-bar'})
const pasteBtn=customCreateElement({tag:'a',parent:bar,attrs:{href:'#',title:'Paste features'},className:'leaflet-draw-misc-restore bi bi-clipboard-plus',events:{click:async(e)=>{e.preventDefault()
const text=await navigator.clipboard.readText()
if(!text)return
try{let newFeatures=JSON.parse(text)
if(newFeatures.type==='FeatureCollection')newFeatures=newFeatures.features
if(newFeatures.type==='Feature')newFeatures=[newFeatures]
if(Object.keys(newFeatures).length===2&&newFeatures.type&&newFeatures.coordinates)newFeatures=[turf.feature(newFeatures)]
if(!Array.isArray(newFeatures))return
newFeatures=(await normalizeGeoJSON(turf.featureCollection(newFeatures))).features
const copyId=generateRandomString()
newFeatures.forEach(async f=>{const prefix=`copied_feature`
let propKey=`__${prefix}__`
let count=0
while(Object.keys(f.properties).includes(propKey)){count+=1
propKey=`__${prefix}_${count}__`}
f.properties[`${propKey}`]=f.properties.__gsl_id__
f.properties[`__copy_id${count ? `_${count}` : ''}__`]=copyId
delete f.properties.__gsl_id__
f.properties.__gsl_id__=await hashJSON(f.properties)})
const{gisData,queryExtent}=await getFromGISDB(targetLayer._indexedDBKey)
gisData.features=[...gisData.features,...newFeatures]
await saveToGISDB(turf.clone(gisData),{id:targetLayer._indexedDBKey,queryExtent:turf.bboxPolygon(turf.bbox(gisData)).geometry})
targetLayer._group.getLayers().forEach(i=>{if(i._indexedDBKey!==targetLayer._indexedDBKey)return
updateLeafletGeoJSONLayer(i,{geojson:gisData,updateLocalStorage:false})})
drawControl._addChange({type:'created',features:newFeatures.map(i=>i.properties.__gsl_id__)})}catch(error){console.log(error)}}}})
const undoLastChange=async({lastChange}={})=>{if(!lastChange){const changes=JSON.parse(localStorage.getItem(drawControlChangesKey)??'[]')
lastChange=changes.pop()
localStorage.setItem(drawControlChangesKey,JSON.stringify(changes))}
if(!lastChange)return
const gisData=(await getFromGISDB(targetLayer._indexedDBKey)).gisData
if(lastChange.type==='created'){gisData.features=gisData.features.filter(i=>!lastChange.features.includes(i.properties.__gsl_id__))}
if(lastChange.type==='deleted'){gisData.features=[...gisData.features,...lastChange.features.map(i=>i.old)]}
if(lastChange.type==='edited'){const gslIds=lastChange.features.map(i=>i.new.properties.__gsl_id__)
const oldFeatures={}
lastChange.features.forEach(i=>oldFeatures[i.old.properties.__gsl_id__]=i.old)
gisData.features=[...gisData.features.filter(i=>!gslIds.includes(i.properties.__gsl_id__)),...Object.values(oldFeatures)]}
if(lastChange.type==='restore'){const[id,version]=targetLayer._indexedDBKey.split('--version')
gisData.features=(await getFromGISDB(`${id}--version${lastChange.features[0].old}`)).gisData.features}
await saveToGISDB(turf.clone(gisData),{id:targetLayer._indexedDBKey,queryExtent:turf.bboxPolygon(turf.bbox(gisData)).geometry})
targetLayer._group.getLayers().forEach(i=>{if(i._indexedDBKey!==targetLayer._indexedDBKey)return
updateLeafletGeoJSONLayer(i,{geojson:gisData,updateLocalStorage:false})})}
const undoBtn=customCreateElement({tag:'a',parent:bar,attrs:{href:'#'},className:'leaflet-draw-misc-restore bi bi-arrow-return-left',events:{mouseover:async(e)=>{const changes=JSON.parse(localStorage.getItem(drawControlChangesKey)??'[]')
e.target.setAttribute('title',changes.length?`Undo last change`:`No changes to undo`)},click:async(e)=>{e.preventDefault()
await undoLastChange()}}})
const restoreBtn=customCreateElement({tag:'a',parent:bar,attrs:{href:'#','data-indexeddbkey-version':Number(targetLayer._indexedDBKey.split('--version')[1])-1},className:'leaflet-draw-misc-restore bi bi-skip-backward',events:{mouseover:async(e)=>{const[id,version]=targetLayer._indexedDBKey.split('--version')
const currentVersion=Number(e.target.getAttribute('data-indexeddbkey-version'))
const previousVersion=(await getAllGISDBKeys()).filter(i=>i.startsWith(id)).map(i=>Number(i.split('--version')[1])).filter(i=>i<currentVersion).sort((a,b)=>a-b).pop()
e.target.setAttribute('title',previousVersion?`Restore to version ${previousVersion}`:`No older version to restore`)},click:async(e)=>{const handler=async()=>{const[id,version]=targetLayer._indexedDBKey.split('--version')
const currentVersion=Number(e.target.getAttribute('data-indexeddbkey-version'))
const previousVersion=(await getAllGISDBKeys()).filter(i=>i.startsWith(id)).map(i=>Number(i.split('--version')[1])).filter(i=>i<currentVersion).sort((a,b)=>a-b).pop()
if(!previousVersion)return
e.target.setAttribute('data-indexeddbkey-version',previousVersion)
const{gisData,queryExtent}=await getFromGISDB(`${id}--version${previousVersion}`)
await saveToGISDB(turf.clone(gisData),{id:targetLayer._indexedDBKey,queryExtent,})
targetLayer._group.getLayers().forEach(i=>{if(i._indexedDBKey!==targetLayer._indexedDBKey)return
updateLeafletGeoJSONLayer(i,{geojson:gisData,updateLocalStorage:false})})
drawControl._addChange({type:'restore',features:[{old:currentVersion,new:previousVersion}]})}
e.preventDefault()
const changes=JSON.parse(localStorage.getItem(drawControlChangesKey)??'[]')
if(changes.length){const alert=contextMenuHandler(e,{confirm:{innerText:`There are unsaved changes. Confirm to restore previous version?`,btnCallback:handler},})
alert.classList.add('bg-danger')}else{handler()}}}})
const saveBtn=customCreateElement({tag:'a',parent:bar,attrs:{href:'#',title:'Save changes'},className:'leaflet-draw-misc-restore bi bi-floppy',events:{click:async(e)=>{e.preventDefault()
const changes=JSON.parse(localStorage.getItem(drawControlChangesKey)??'[]')
if(!changes.length)return
const[id,version]=targetLayer._indexedDBKey.split('--version')
const{gisData,queryExtent}=await getFromGISDB(targetLayer._indexedDBKey)
const newIndexedDBKey=await saveToGISDB(gisData,{id:`${id}--version${Number(version ?? 1)+1}`,queryExtent,})
targetLayer._group._handlers.getAllLayers().forEach(i=>{if(!i._indexedDBKey.startsWith(id))return
i._indexedDBKey=newIndexedDBKey})
map._handlers.updateStoredLegendLayers()
localStorage.removeItem(drawControlChangesKey)
restoreBtn.setAttribute('data-indexeddbkey-version',targetLayer._indexedDBKey.split('--version')[1]-1)}}})
const disableBtn=customCreateElement({tag:'a',parent:bar,attrs:{href:'#',title:'Disable layer editor'},className:'leaflet-draw-misc-restore bi bi-x-lg',events:{click:async(e)=>{e.preventDefault()
await toggleLeafletLayerEditor(targetLayer)}}})
Array.from(container.querySelectorAll('.leaflet-bar')).forEach(i=>{i.classList.add('border-0','shadow-lg')
i.firstChild?.classList.add('rounded-top')
i.lastChild?.classList.add('rounded-bottom')})
Array.from(container.querySelectorAll('a')).forEach(btn=>{btn.classList.add(`text-bg-${getPreferredTheme()}`,'border-0','d-flex','justify-content-center','align-items-center')
btn.style.backgroundImage='none'
btn.style.height='32px'
btn.style.width='32px'
const icon=customCreateElement({parent:btn,tag:'i',className:'pe-none bi'})
if(btn.className.includes('polyline'))icon.classList.add('bi-bezier2')
if(btn.className.includes('polygon'))icon.classList.add('bi-pentagon')
if(btn.className.includes('rectangle'))icon.classList.add('bi-square')
if(btn.className.includes('marker'))icon.classList.add('bi-geo-alt')
if(btn.className.includes('edit-edit'))icon.classList.add('bi-pencil-square')
if(btn.className.includes('edit-remove'))icon.classList.add('bi-trash')})
const drawEvents={'created':async(e)=>{const geojson=turf.featureCollection([e.layer.toGeoJSON()])
if(!targetLayer._indexedDBKey)return targetLayer.addData(geojson)
await normalizeGeoJSON(geojson)
const{gisData,queryExtent}=await getFromGISDB(targetLayer._indexedDBKey)
gisData.features.push(geojson.features[0])
await saveToGISDB(turf.clone(gisData),{id:targetLayer._indexedDBKey,queryExtent:turf.bboxPolygon(turf.bbox(gisData)).geometry})
targetLayer._group.getLayers().forEach(i=>{if(i._indexedDBKey!==targetLayer._indexedDBKey)return
updateLeafletGeoJSONLayer(i,{geojson:gisData,updateLocalStorage:false})})
drawControl._addChange({type:'created',features:geojson.features.map(i=>i.properties.__gsl_id__)})},'deleted':async(e)=>{e.layer.removeFrom(targetLayer)
if(!targetLayer._indexedDBKey)return
const geojson=turf.featureCollection([e.layer.toGeoJSON()])
const gslIds=geojson.features.map(i=>i.properties.__gsl_id__)
const{gisData,queryExtent}=await getFromGISDB(targetLayer._indexedDBKey)
gisData.features=gisData.features.filter(i=>!gslIds.includes(i.properties.__gsl_id__))
await saveToGISDB(turf.clone(gisData),{id:targetLayer._indexedDBKey,queryExtent:turf.bboxPolygon(turf.bbox(gisData)).geometry})
targetLayer._group.getLayers().forEach(i=>{if(i._indexedDBKey!==targetLayer._indexedDBKey)return
updateLeafletGeoJSONLayer(i,{geojson:gisData,updateLocalStorage:false})})
drawControl._addChange({type:'deleted',features:geojson.features.map(i=>{return{old:i,new:null}})})},'edited':async(e)=>{if(!targetLayer._indexedDBKey)return
const features=[]
for(const i of e.layers.getLayers()){const newFeature=(await normalizeGeoJSON(turf.featureCollection([i.toGeoJSON()]))).features[0]
features.push({old:i.feature,new:newFeature})}
const gslIds=features.map(i=>i.old.properties.__gsl_id__)
const{gisData,queryExtent}=await getFromGISDB(targetLayer._indexedDBKey)
gisData.features=[...gisData.features.filter(i=>!gslIds.includes(i.properties.__gsl_id__)),...features.map(i=>i.new)]
await saveToGISDB(turf.clone(gisData),{id:targetLayer._indexedDBKey,queryExtent:turf.bboxPolygon(turf.bbox(gisData)).geometry})
targetLayer._group.getLayers().forEach(i=>{if(i._indexedDBKey!==targetLayer._indexedDBKey)return
updateLeafletGeoJSONLayer(i,{geojson:gisData,updateLocalStorage:false})})
drawControl._addChange({type:'edited',features,})},'editstart':(e)=>{},'editstop':(e)=>{drawControl._toggleFeatureEdit()},}
Object.keys(drawEvents).forEach(i=>map.on(`draw:${i}`,drawEvents[i]))
drawControl.onRemove=(map)=>{try{drawControl?._toolbars?.draw?.disable?.()
drawControl?._toolbars?.edit?.disable?.()}catch(error){console.log(error)}
drawControl._toggleFeatureEdit()
Object.keys(drawEvents).forEach(i=>map.off(`draw:${i}`))}
return drawControl};const getLeafletStyleParams=({iconType='bi',iconSpecs=['circle-fill'],iconDelimiter=' ',iconSize=10,iconRotation=0,iconOffset='0,0',iconFill=true,iconStroke=true,iconShadow=false,iconGlow=false,textShadow=null,textWrap=false,boldFont=false,italicFont=false,textAlignment='center',justifytAlignment='center',fontSerif=false,fillColor=generateRandomColor(),patternBgColor,patternBg=true,fillOpacity=0.5,fillPattern='solid',fillPatternId='',strokeColor=true,strokeOpacity=1,strokeWidth=1,lineCap='round',lineJoin='round',lineBreak='solid',dashArray,dashOffset,}={})=>{const hslaColor=manageHSLAColor(fillColor)
fillColor=hslaColor.toString()
strokeColor=strokeColor===true?hslaColor.toString({l:hslaColor.l/2}):strokeColor||'transparent'
if(!patternBgColor)patternBgColor=hslaColor.toString({h:(hslaColor.h+180)%360,l:hslaColor.l/2})
return{strokeWidth,strokeColor,strokeOpacity,fillColor,patternBgColor,patternBg,fillOpacity,iconSpecs,iconDelimiter,iconSize,iconShadow,iconGlow,dashArray,dashOffset,lineCap,lineJoin,iconType,textWrap,boldFont,fillPattern,iconRotation,iconOffset,fillPatternId,iconFill,iconStroke,italicFont,textAlignment,justifytAlignment,fontSerif,lineBreak,textShadow,}}
const getLeafletLayerStyle=(feature,styleParams={},{renderer,allowCircleMarker=true,forLegend=false,}={})=>{const type=feature?.geometry?.type?.toLowerCase().split('multi').filter(i=>i!=='')[0]
if(!type)return
const{strokeWidth,strokeColor,strokeOpacity,fillColor,patternBgColor,patternBg,fillOpacity,iconSpecs,iconDelimiter,iconSize,iconShadow,iconGlow,dashArray,dashOffset,lineCap,lineJoin,iconType,textWrap,boldFont,fillPattern,iconRotation,iconOffset,fillPatternId,iconFill,iconStroke,italicFont,textAlignment,justifytAlignment,fontSerif,lineBreak,textShadow,}=getLeafletStyleParams(styleParams)
const hslaColor=manageHSLAColor(fillColor)
const isPoint=type==='point'
const isCanvas=renderer instanceof L.Canvas
const isCircleMarker=false
if(isPoint&&!isCircleMarker){let element
const svg=document.querySelector(`svg#${fillPatternId}-svg`)
if(forLegend||!svg||Array('html','property').includes(iconType)||(textWrap&&Array('text').includes(iconType))){element=Array('html','svg').includes(iconType)?customCreateElement({innerHTML:iconSpecs[0]}).firstChild:iconType==='img'?customCreateElement({innerHTML:removeWhitespace(`<img src="${iconSpecs[0]}" alt="icon">`)}).firstChild:customCreateElement({innerHTML:(iconType==='bi'?`&#x${bootstrapIcons[iconSpecs[0]] ?? 'F287'};`:Array('text','emoji').includes(iconType)?iconSpecs[0]:iconType==='property'?iconSpecs.map(i=>feature.properties?.[i]).join(iconDelimiter)??'':''),style:{fontSize:`${iconSize}px`,fontFamily:(iconType==='bi'?'bootstrap-icons':fontSerif?'Georgia, "Times New Roman", Times, serif':'default'),color:iconFill?hslaColor?.toString({a:fillOpacity})||fillColor:'transparent',...(textWrap?{maxWidth:`${iconSize}px`}:{})},className:removeWhitespace(`
                    h-100 w-100 d-flex justify-content-${justifytAlignment} text-${textAlignment} align-items-center lh-1
                    ${textWrap ? 'text-wrap' : 'text-nowrap'}
                    ${boldFont ? 'fw-bold' : 'fw-normal'}
                    ${italicFont ? 'fst-italic' : 'fst-normal'}
                `),})
if(element instanceof Element){if(Array('svg','img').includes(iconType)||Array('svg','img').includes(element.tagName.toLowerCase())){element.setAttribute('width',iconSize)
element.setAttribute('height',iconSize)
if(iconType==='svg'){element.setAttribute('fill',(()=>{if(iconFill)element.setAttribute('fill-opacity',fillOpacity)
return iconFill?fillColor:'none'})())
element.setAttribute('stroke',(()=>{if(iconStroke){element.setAttribute('stroke-opacity',strokeOpacity)
element.setAttribute('stroke-width',strokeWidth)
element.setAttribute('stroke-linecap',lineCap)
element.setAttribute('stroke-linejoin',lineJoin)
element.setAttribute('stroke-dasharray',dashArray)
element.setAttribute('stroke-dashoffset',dashOffset)}
return iconStroke?strokeColor:'none'})())}}
if(Array('emoji','img','html').includes(iconType)){element.style.opacity=fillOpacity}
const[offsetX,offsetY]=iconOffset.split(',').map(i=>parseInt(i))
element.style.transform=`rotate(${iconRotation}deg) translate(${offsetX}px, ${offsetY}px)`
element.style.transformOrigin=`50% 50%`
element.style.WebkitTextStroke=iconStroke?`${strokeWidth}px ${manageHSLAColor(strokeColor)?.toString({a:strokeOpacity}) || strokeColor}`:''
element.style.textShadow=textShadow}}else{element=svg.cloneNode(true)
element.removeAttribute('id')}
return L.divIcon({className:'bg-transparent d-flex justify-content-center align-items-center',html:element?.outerHTML??'',})}else{const hasStroke=!isPoint||iconStroke
const params={color:hasStroke?strokeColor:'transparent',weight:hasStroke?strokeWidth:0,opacity:hasStroke?strokeOpacity:0,lineCap,lineJoin,dashArray,dashOffset,renderer,}
if(isPoint){params.radius=iconSize/2
params.fillColor=iconFill?fillColor:'none'
params.fillOpacity=iconFill?fillOpacity:0}
if(type==='polygon'){params.fillOpacity=fillOpacity
params.fillColor=fillPattern==='icon'?(()=>{const bgColor=patternBg?patternBgColor:'transparent'
if(isCanvas){const imgId=`${fillPatternId}-img`
const img=document.querySelector(`#${imgId}`)
if(img instanceof Element&&img.tagName==='IMG'&&img.getAttribute('src')){params.imgId=imgId
params.stroke=strokeColor&&strokeOpacity>0?true:false
params.fill=fillColor&&fillOpacity>0?true:false}}else{return`url(#${fillPatternId}-pattern)`}
return bgColor})():fillPattern==='solid'?fillColor:'transparent'}
return params}}
const getLeafletLayerBbox=async(layer)=>{const indexedDBKey=layer._indexedDBKey??''
if(layer instanceof L.GeoJSON&&staticVectorFormats.find(i=>indexedDBKey.startsWith(i))){const geojson=(await getFromGISDB(indexedDBKey))?.gisData
if(geojson)return turf.bbox(geojson)}
if(layer._params?.bbox){return JSON.parse(layer._params?.bbox).splice(0,4)}
if(layer.getBounds){try{const b=layer.getBounds()
return[b.getWest(),b.getSouth(),b.getEast(),b.getNorth(),]}catch(error){}}
return[-180,-90,180,90]}
const zoomToLeafletLayer=async(layer,map,{zoom=18,}={})=>{if(layer.getLatLng){return map.setView(layer.getLatLng(),zoom)}
const bbox=await getLeafletLayerBbox(layer)
const bounds=L.geoJSON(turf.bboxPolygon(bbox)).getBounds()
zoomLeafletMapToBounds(map,bounds)}
const leafletLayerStyleToHTML=(style,type)=>{if(style.options){const element=customCreateElement({innerHTML:style.options.html}).firstChild
element?.classList.remove('position-absolute')
return element?.outerHTML}else{const isPoint=type==='point'
const isLineString=type==='linestring'
const iconSize=(style.radius*2)+(style.opacity?style.weight*2:0)
const width=isPoint?iconSize:20
const height=isPoint?iconSize:14
const svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
svg.setAttribute('width',width)
svg.setAttribute('height',height)
svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.display='block'
const symbol=document.createElementNS('http://www.w3.org/2000/svg',`${isPoint ? 'circle' : isLineString ? 'line' : 'rect'}`)
symbol.setAttribute('stroke',style.color)
symbol.setAttribute('stroke-opacity',style.opacity)
symbol.setAttribute('stroke-width',style.weight)
symbol.setAttribute('stroke-linecap',style.lineCap)
symbol.setAttribute('stroke-linejoin',style.lineJoin)
symbol.setAttribute('stroke-dasharray',style.dashArray)
symbol.setAttribute('stroke-dashoffset',style.dashOffset)
if(isLineString){symbol.setAttribute('x1',0)
symbol.setAttribute('y1',height/2)
symbol.setAttribute('x2',width)
symbol.setAttribute('y2',height/2)}else{if(isPoint){symbol.setAttribute('r',style.radius)
symbol.setAttribute('cx',width/2)
symbol.setAttribute('cy',height/2)}else{symbol.setAttribute('x',0)
symbol.setAttribute('y',0)
symbol.setAttribute('width',width)
symbol.setAttribute('height',height)}
symbol.setAttribute('fill',style.fillColor)
symbol.setAttribute('fill-opacity',style.fillOpacity)
symbol.setAttribute('fill-rule','evenodd')}
svg.appendChild(symbol)
return svg.outerHTML}}
const validateLeafletLayerCoords=(coords,precision=6)=>{const reference={'lat':{min:-90,max:90},'lng':{min:-180,max:180},}
Object.keys(coords).forEach(dir=>{const min=reference[dir].min
const max=reference[dir].max
let value=coords[dir]
if(value<min){value=min}else if(value>max){value=max}else{value=Number(value.toFixed(precision))}
coords[dir]=value})}
const getLeafletLayerType=(layer)=>{if(layer.feature)return'feature'
if(layer instanceof L.GeoJSON)return'geojson'}
const findLeafletFeatureLayerParent=(layer)=>{if(!layer.feature||!layer._eventParents)return
for(const p of Object.values(layer._eventParents)){if(p instanceof L.GeoJSON)return p}}
const handleStyleParams=async(styleParams,{controller}={})=>{let defs
try{if(!styleParams)throw new Error('No style params.')
let{strokeWidth,strokeColor,strokeOpacity,fillColor,patternBgColor,patternBg,fillOpacity,iconSpecs,iconDelimiter,iconSize,iconShadow,iconGlow,dashArray,dashOffset,lineCap,lineJoin,iconType,textWrap,boldFont,fillPattern,iconRotation,iconOffset,fillPatternId,iconFill,iconStroke,italicFont,fontSerif,lineBreak,textShadow,}=styleParams
const hslaColor=manageHSLAColor(fillColor)
textShadow=styleParams.textShadow=Array(iconShadow?removeWhitespace(`
                ${iconSize*0.1}px 
                ${iconSize*0.1}px 
                ${iconSize*0.2}px 
                ${hslaColor.toString({l:hslaColor.l/10,a:fillOpacity})}
            `):'',iconGlow?removeWhitespace(`
                0 0 ${iconSize*0.5}px ${hslaColor.toString({a:fillOpacity*1})}, 
                0 0 ${iconSize*1}px ${hslaColor.toString({a:fillOpacity*0.75})}, 
                0 0 ${iconSize*1.5}px ${hslaColor.toString({a:fillOpacity*0.5})}, 
                0 0 ${iconSize*2}px ${hslaColor.toString({a:fillOpacity*0.25})}
            `):'').filter(i=>i!=='').join(',')
const svgFillDefs=document.querySelector(`svg#svgFillDefs`)
if(fillPatternId){svgFillDefs.querySelector(`#${fillPatternId}`)?.remove()
delete styleParams.fillPatternId}
if(fillPattern!=='icon'&&iconType!=='svg'){throw new Error(`Fill pattern: ${fillPattern}; icon type: ${iconType}`)}
const id=styleParams.fillPatternId=generateRandomString()
defs=document.createElementNS(svgNS,'defs')
defs.id=id
let icon
const img=customCreateElement({tag:'img',id:`${id}-img`,attrs:{alt:'icon',},style:{opacity:fillOpacity}})
if(!iconSpecs.length)throw new Error('No icon specification.')
const buffer=(iconType==='img'||!iconStroke?0:(strokeWidth*2))+(Array('bi','text','emoji','html','property').includes(iconType)?Math.max((iconGlow?iconSize*3:0),(iconShadow?iconSize*0.2:0),(iconType!=='html'&&italicFont?iconSize*0.5:0),):0)
const[width,height,outerHTML]=(()=>{const style=getLeafletLayerStyle({geometry:{type:'MultiPoint',}},{...styleParams,fillPatternId:null,textWrap:false,iconRotation:0,iconOffset:'0,0',fillOpacity:1,},{allowCircleMarker:false,})
const tempElement=customCreateElement({innerHTML:leafletLayerStyleToHTML(style,'point')}).firstChild
tempElement?.classList?.add('position-absolute')
tempElement?.classList?.remove('h-100','w-100','d-flex','justify-content-center','align-items-center')
document.body.appendChild(tempElement)
const bounds=tempElement.getBoundingClientRect()
document.body.removeChild(tempElement)
return[bounds.width,bounds.height,tempElement.outerHTML]})()
const svgWidth=width+buffer
const svgHeight=height+buffer
const patternGap=iconType==='img'?0:iconSize
const patternWidth=svgWidth+patternGap
const patternHeight=svgHeight+patternGap
img.setAttribute('width',patternWidth)
img.setAttribute('height',patternHeight)
if(Array('svg','img').includes(iconType)){if(iconType==='svg'){defs.innerHTML=iconSpecs[0]
icon=defs.firstChild}
if(iconType==='img'){icon=document.createElementNS(svgNS,'image')
icon.setAttribute('href',iconSpecs[0])
defs.appendChild(icon)}
icon.setAttribute('width',width)
icon.setAttribute('height',height)}
if(Array('bi','text','emoji','property').includes(iconType)){icon=document.createElementNS(svgNS,'text')
icon.innerHTML=(iconType==='bi'?`&#x${bootstrapIcons[iconSpecs[0]] ?? 'F287'};`:iconType==='property'?iconSpecs.join(iconDelimiter):iconSpecs[0]??'')
icon.setAttribute('class',removeWhitespace(`
                text-center lh-1
                ${textWrap ? 'text-wrap' : 'text-nowrap'}
                ${boldFont ? 'fw-bold' : 'fw-normal'}
                ${italicFont ? 'fst-italic' : 'fst-normal'}
            `))
icon.setAttribute('x','50%')
icon.setAttribute('y','50%')
icon.setAttribute('text-anchor','middle')
icon.setAttribute('dominant-baseline','central')
icon.setAttribute('font-size',iconSize)
icon.setAttribute('font-family',(iconType==='bi'?'bootstrap-icons':fontSerif?'Georgia, Times, serif':'default'))
defs.appendChild(icon)}
const dataUrl=iconType==='svg'?await svgToDataURL(outerHTML):await outerHTMLToDataURL(outerHTML,{width:svgWidth,height:svgHeight,x:0-(buffer/2),y:0-(buffer/2),})
if(iconType==='html'&&dataUrl){icon=document.createElementNS(svgNS,'image')
icon.setAttribute('href',dataUrl)
defs.appendChild(icon)}
const imgSrc=await createNewImage(iconType==='img'?iconSpecs[0]:dataUrl,{opacity:fillOpacity,angle:iconRotation,width:patternWidth,height:patternHeight,})
img.setAttribute('src',imgSrc)
defs.appendChild(img)
if(icon){const[offsetX,offsetY]=(iconOffset??'0,0').split(',').map(i=>parseInt(i))
icon.id=`${id}-icon`
icon.style.textShadow=textShadow
if(Array('emoji','img','html').includes(iconType)){icon.style.opacity=fillOpacity}
icon.setAttribute('fill',(()=>{if(iconFill)icon.setAttribute('fill-opacity',fillOpacity)
return iconFill?fillColor:'none'})())
icon.setAttribute('stroke',(()=>{if(iconStroke){icon.setAttribute('stroke-opacity',strokeOpacity)
icon.setAttribute('stroke-width',strokeWidth)
icon.setAttribute('stroke-linecap',lineCap)
icon.setAttribute('stroke-linejoin',lineJoin)
icon.setAttribute('stroke-dasharray',dashArray)
icon.setAttribute('stroke-dashoffset',dashOffset)}
return iconStroke?strokeColor:'none'})())
const svg=document.createElementNS(svgNS,'svg')
svg.id=`${id}-svg`
svg.classList.add('position-absolute')
svg.setAttribute('width',svgWidth)
svg.setAttribute('height',svgHeight)
svg.setAttribute('viewbox',`0 0 ${svgWidth} ${svgHeight}`)
svg.style.transform=`rotate(${iconRotation}deg) translate(${offsetX}px, ${offsetY}px)`
svg.style.transformOrigin=`50% 50%`
defs.appendChild(svg)
const svgUse=document.createElementNS(svgNS,'use')
svgUse.setAttribute('href',`#${id}-icon`)
svg.appendChild(svgUse)
const newPattern=document.createElementNS(svgNS,'pattern')
newPattern.id=`${id}-pattern`
newPattern.setAttribute('patternUnits','userSpaceOnUse')
newPattern.setAttribute('width',patternWidth)
newPattern.setAttribute('height',patternHeight)
newPattern.setAttribute('viewbox',`0 0 ${patternWidth} ${patternHeight}`)
newPattern.style.transform=`rotate(${iconRotation}deg)`
newPattern.style.transformOrigin=`50% 50%`
defs.appendChild(newPattern)
const patternRect=document.createElementNS(svgNS,'rect')
patternRect.setAttribute('width',patternWidth)
patternRect.setAttribute('height',patternHeight)
patternRect.setAttribute('fillOpacity',fillOpacity)
patternRect.setAttribute('fill',patternBg?patternBgColor:'none')
newPattern.appendChild(patternRect)
const patternUse=svg.cloneNode(true)
patternUse.style.transform=``
patternUse.style.transformOrigin=``
patternUse.removeAttribute('id')
Array.from(patternUse.querySelectorAll('use')).forEach(i=>{const opacity=strokeOpacity+(fillOpacity/2)
i.setAttribute('fill-opacity',1)
i.setAttribute('stroke-opacity',(strokeOpacity>0?opacity>100?100:opacity:strokeOpacity))})
patternUse.setAttribute('x',buffer/2)
patternUse.setAttribute('y',buffer/2)
newPattern.appendChild(patternUse)}
svgFillDefs.appendChild(defs)}catch(error){if(styleParams?.fillPatternId)delete styleParams.fillPatternId
if(defs)defs.remove()}
return styleParams}
const cloneFillPatternDefs=(currentId)=>{if(!currentId)return
const defs=document.querySelector(`svg#svgFillDefs defs#${currentId}`)
if(!defs)return
const newId=generateRandomString()
const clonedDefs=defs.cloneNode(true)
clonedDefs.id=newId
svgFillDefs.appendChild(clonedDefs)
Array.from(clonedDefs.children).forEach(e=>{e.id=`${newId}-${e.id.replaceAll(`${currentId}-`,'')}`})
Array.from(clonedDefs.querySelectorAll('use')).forEach(e=>{e.setAttribute('href',`#${newId}-${e.getAttribute('href').replaceAll(`#${currentId}-`,'')}`)})
return clonedDefs}
const cloneLeafletLayerStyles=(layer)=>{const properties=structuredClone(layer._properties??{})
const symbology=properties.symbology
Array(symbology?.default,...Object.values(symbology?.groups??{})).forEach(i=>{if(!i)return
const newDefs=cloneFillPatternDefs(i.styleParams.fillPatternId)
i.styleParams.fillPatternId=newDefs?.id})
return properties}
const deleteLeafletLayerFillPatterns=(layer)=>{const svgFillDefs=document.querySelector(`svg#svgFillDefs`)
const symbology=layer._properties.symbology
Array(symbology.default,...Object.values(symbology.groups??{})).forEach(i=>{const fillPatternId=i.styleParams.fillPatternId
if(!fillPatternId)return
const defs=svgFillDefs.querySelector(`#${fillPatternId}`)
defs?.remove()})}
const leafletLayerIsVisible=(layer,{addLayer=true,updateLocalStorage=false}={})=>{if(!layer)return
const group=layer._group
const map=group._map
if(!map||!group)return
const visibility=layer._properties.visibility
let isVisible=true
if(visibility.active){const mapScale=getLeafletMeterScale(map)
const layerMinScale=visibility.min||0
const layerMaxScale=visibility.max||5000000
isVisible=mapScale<=layerMaxScale&&mapScale>=layerMinScale}
if(addLayer){isVisible?group._handlers.removeInvisibleLayer(layer):group._handlers.addInvisibleLayer(layer)}
if(updateLocalStorage)map._handlers.updateStoredLegendLayers({layer})
return isVisible}
const urlToLeafletLayer=async({group,add=false,params={},})=>{if(!group)return
const format=params.format
const indexedDBKey=createLayerIndexedDBKey(params)
const fileName=params.name.split('.')
params.type=format==='file'?(params.type??fileName[fileName.length-1]):(params.type??format)
const layer=await createLeafletLayer(params,{indexedDBKey,group,add})
return layer}
const createLayerIndexedDBKey=(params)=>{const format=params.format
let formatParams
if(format==='overpass'){formatParams={types:ALL_OVERPASS_ELEMENT_TYPES,tags:params.tags}}else if(format.startsWith('ogc-')){formatParams={url:params.url,name:params.name,styles:params.styles,srid:params.srid,}}else if(format==='osm'){formatParams={url:params.url,format,type:params.type,}}else if(format==='file'){formatParams={url:params.url,format,name:params.name,type:params.type,srid:params.srid,xField:params.xField,yField:params.yField,}}else{formatParams=structuredClone(params)
delete formatParams.abstract
delete formatParams.attribution
delete formatParams.bbox
delete formatParams.keywords
delete formatParams.styles
delete formatParams.thumbnails
delete formatParams.title
console.log(formatParams)}
return`${format};${JSON.stringify({params:formatParams})}`}
const addLayerFromData=async(el,{map=getSearchMap(),customStyleParams,}={})=>{const params=JSON.parse(el.dataset.layerParams)
if(params.bbox)params.bbox=JSON.stringify(params.bbox)
if(params.tags)params.tags=cleanOverpassTags(params.tags)
createLeafletLayer(params,{indexedDBKey:createLayerIndexedDBKey(params),group:map?._handlers.getLayerGroups().library,add:true,customStyleParams,})}
const createLeafletLayer=async(params,{indexedDBKey,data,group,add,properties,customStyleParams,}={})=>{const map=group._map
const pane=createCustomPane(map)
const format=(params.format??'geojson').toLowerCase()
const type=(params.type??'geojson').toLowerCase()
const attribution=(params.attribution??'').trim()
params.attribution=attribution&&!Array('none','').includes(attribution.toLowerCase())?attribution:createAttributionTable(data)?.outerHTML
let layer
if(Array(format,type).some(i=>Array('geojson','csv','gpx','kml','wfs','osm','overpass','unknown','json').includes(i))){layer=await getLeafletGeoJSONLayer({indexedDBKey,geojson:data,group,pane,params,properties,customStyleParams,})}else{if(type==='xyz'){layer=L.tileLayer(params.url,{pane,maxZoom:20,})}
if(type==='wms'){const options={layers:params.name,format:'image/png',transparent:true,pane,maxZoom:20,}
const styles=JSON.parse(params.styles??'{}')
if(Object.keys(styles).length){const name=Object.keys(styles)[0]
options.styles=name
params.legend=styles[name].legend}
layer=L.tileLayer.wms(params.url,options)}
if(layer){layer._params=params
layer._indexedDBKey=indexedDBKey
layer._group=group
layer._properties=properties??{info:{showLegend:true,showAttribution:true,},visibility:{active:false,min:10,max:5000000,},}
if(!layer.getBounds&&params.bbox){const[w,s,e,n,crs]=JSON.parse(params.bbox)
layer.getBounds=()=>L.latLngBounds([[s,w],[n,e]])}}}
if(layer&&add){try{group.addLayer(layer)}catch(error){console.log(error)
group.removeLayer(layer)
alert('Failed to create layer.')}}
return layer}
const fileToLeafletLayer=async({file,group,add=false,filesArray=[],params={}}={})=>{if(!file||!group)return
const fileName=file.name.split('.')
params.title=params.title??(()=>{const title=fileName.slice(0,-1).join('.').split('/')
return title[title.length-1]})
params.type=params.type??fileName[fileName.length-1]
const rawData=await getFileRawData(file)
if(!rawData)return
const data=rawDataToLayerData(rawData,params)
if(!data)return
const layer=await createLeafletLayer(params,{data,group,add})
return layer}
const getLayerFormat=(params)=>{return`${COLLECTION_FORMATS[params.format]}${
        params.format === 'file' ? `• ${params.type.toUpperCase()}` : ''
    }`};const getLeafletLayerContextMenu=async(event,layer,{}={})=>{if(!layer)return
const type=getLeafletLayerType(layer)
const feature=layer.feature
let brokenGeom
try{brokenGeom=feature?Array('flatten','unkinkPolygon').some(i=>turf[i](feature).features.length>1):null}catch{}
const featureType=feature?turf.getType(feature):null
const geojsonLayer=type==='geojson'?layer:feature?findLeafletFeatureLayerParent(layer):null
const gslId=feature?feature?.properties?.__gsl_id__:null
const indexedDBKey=(geojsonLayer??layer)._indexedDBKey
const group=layer._group??geojsonLayer?._group
if(!group)return
const layerGeoJSON=await(async()=>{if(!Array('feature','geojson').includes(type))return
if(feature)return turf.featureCollection([feature])
const featureCount=layer['getLayers']?.().length
try{if(featureCount){return layer.toGeoJSON()}else{throw new Error('No features')}}catch(error){if(featureCount){return turf.featureCollection(layer.getLayers().map(l=>l.feature))}
return(await getFromGISDB(indexedDBKey))?.gisData}})()
const map=group._map
const mapContainer=map.getContainer()
const isLegendGroup=map._legendLayerGroups.includes(group)
const isLegendFeature=isLegendGroup&&feature
const isSearch=group._name==='search'
const typeLabel=type==='feature'&&!isSearch?type:'layer'
const localLayer=(indexedDBKey??'').startsWith('local')
const editableLayer=isLegendGroup&&geojsonLayer&&localLayer&&(await getFromGISDB(indexedDBKey))?.gisData?.features.length<=1000
const isMapDrawControlLayer=editableLayer&&(indexedDBKey===map._drawControl?._targetLayer?._indexedDBKey)
const isMeasured=(geojsonLayer?._measuredFeatures??[]).includes(gslId)
const isLegendGeoJSONLayer=geojsonLayer&&isLegendGroup
const selectedFeatures=isLegendGeoJSONLayer?geojsonLayer._selectedFeatures??[]:null
const isSelectedFeature=selectedFeatures?.includes(gslId)
const featureCountAll=geojsonLayer?.getLayers().length??0
const featureCountSelected=geojsonLayer?.getLayers().filter(l=>selectedFeatures?.includes(l.feature.properties.__gsl_id__)).length??0
return contextMenuHandler(event,{zoomin:{innerText:`Zoom to ${typeLabel}`,btnCallback:async()=>await zoomToLeafletLayer(layer,map)},zoomSelection:feature||!featureCountSelected?null:{innerText:`Zoom to selection`,btnCallback:async()=>{zoomLeafletMapToBounds(map,L.geoJSON(turf.featureCollection(geojsonLayer.getLayers().map(l=>turf.clone(l.feature)).filter(f=>selectedFeatures.includes(f.properties.__gsl_id__)))).getBounds())}},measure:!geojsonLayer||!feature||brokenGeom||featureType==='Point'||isSearch?null:{innerText:`${isMeasured ? 'Hide' : 'Show'} measurements`,btnCallback:async()=>{geojsonLayer._measuredFeatures=geojsonLayer._measuredFeatures??[]
if(isMeasured){geojsonLayer._measuredFeatures=geojsonLayer._measuredFeatures.filter(i=>i!==gslId)
layer.hideMeasurements()}else{geojsonLayer._measuredFeatures.push(gslId)
layer.showMeasurements()}}},style:!isLegendGroup||feature?null:{innerText:`Layer properties`,btnCallback:async()=>{const styleAccordionSelector=`#${mapContainer.id}-panels-accordion-style`
mapContainer.querySelector(`[data-bs-target="${styleAccordionSelector}"]`).click()
const styleAccordion=mapContainer.querySelector(styleAccordionSelector)
const layerSelect=styleAccordion.querySelector(`select[name="layer"]`)
layerSelect.focus()
layerSelect.value=layer._leaflet_id
layerSelect.dispatchEvent(new Event('change',{bubbles:true,cancelable:true,}))}},selection:!isLegendGeoJSONLayer||!featureCountAll?null:{divider:true,},selectFeature:!isLegendGeoJSONLayer||!feature?null:{innerText:`${isSelectedFeature ? 'Deselect' : 'Select'} feature`,btnCallback:async()=>{disableLeafletMapSelector(map)
isSelectedFeature?geojsonLayer._handlers.deselectFeatureLayer(layer):geojsonLayer._handlers.selectFeatureLayer(layer)}},selectVisible:!isLegendGeoJSONLayer||feature||!featureCountAll||featureCountAll===featureCountSelected?null:{innerText:`Select visible features (${formatNumberWithCommas(featureCountAll)})`,btnCallback:async()=>{disableLeafletMapSelector(map)
geojsonLayer.eachLayer(l=>{geojsonLayer._handlers.selectFeatureLayer(l)})}},deselectVisible:!isLegendGeoJSONLayer||feature||!featureCountSelected?null:{innerText:`Deselect visible features (${formatNumberWithCommas(featureCountSelected)})`,btnCallback:async()=>{disableLeafletMapSelector(map)
geojsonLayer.eachLayer(l=>{geojsonLayer._handlers.deselectFeatureLayer(l)})}},deselectAll:!isLegendGeoJSONLayer||feature||!selectedFeatures.length?null:{innerText:`Deselect all features (${formatNumberWithCommas(selectedFeatures.length)})`,btnCallback:async()=>{disableLeafletMapSelector(map)
geojsonLayer.eachLayer(l=>{geojsonLayer._handlers.deselectFeatureLayer(l)})
geojsonLayer._selectedFeatures=[]}},edit:!editableLayer?null:{divider:true,},deleteFeature:!feature||!isMapDrawControlLayer?null:{innerText:'Delete geometry',btnCallback:async(e)=>{map.fire('draw:deleted',{layer})}},editGeometry:!feature||!isMapDrawControlLayer||brokenGeom?null:{innerText:'Edit geometry',btnCallback:async(e)=>{map._drawControl._toggleFeatureEdit({feature})}},repairGeometry:!feature||!isMapDrawControlLayer||!brokenGeom?null:{innerText:'Explode geometry',btnCallback:async(e)=>{map._drawControl._explodeFeatureGeometry(feature)}},toggleEditor:!editableLayer?null:{innerText:`${isMapDrawControlLayer ? 'Disable' : 'Enable'} layer editor`,btnCallback:async()=>await toggleLeafletLayerEditor(geojsonLayer)},paste:!feature||!isMapDrawControlLayer?null:{divider:true,},pasteFeature:!feature||!isMapDrawControlLayer?null:{innerText:'Paste feature',btnCallback:async()=>{const text=await navigator.clipboard.readText()
if(!text)return
try{let newFeature=JSON.parse(text)
if(newFeature.type!=='Feature')return
newFeature=(await normalizeGeoJSON(turf.featureCollection([newFeature]))).features[0]
const gslId=newFeature.properties.__gsl_id__=feature.properties.__gsl_id__
const{gisData,queryExtent}=await getFromGISDB(indexedDBKey)
gisData.features=[...gisData.features.filter(i=>i.properties.__gsl_id__!==gslId),newFeature]
await saveToGISDB(turf.clone(gisData),{id:indexedDBKey,queryExtent:turf.bboxPolygon(turf.bbox(gisData)).geometry})
group.getLayers().forEach(i=>{if(i._indexedDBKey!==indexedDBKey)return
updateLeafletGeoJSONLayer(i,{geojson:gisData,updateLocalStorage:false})})
map._drawControl._addChange({type:'edited',features:[{old:feature,new:newFeature}]})}catch(error){console.log(error)}}},pasteProperties:!feature||!isMapDrawControlLayer?null:{innerText:'Paste properties',btnCallback:async()=>{const text=await navigator.clipboard.readText()
if(!text)return
try{let newProperties=JSON.parse(text)
if(newProperties.type==='Feature'){newProperties=newProperties.properties}
if(!newProperties)return
let newFeature=structuredClone(feature)
newFeature.properties=newProperties
newFeature=(await normalizeGeoJSON(turf.featureCollection([newFeature]))).features[0]
const gslId=newFeature.properties.__gsl_id__=feature.properties.__gsl_id__
const{gisData,queryExtent}=await getFromGISDB(indexedDBKey)
gisData.features=[...gisData.features.filter(i=>i.properties.__gsl_id__!==gslId),newFeature]
await saveToGISDB(turf.clone(gisData),{id:indexedDBKey,queryExtent:turf.bboxPolygon(turf.bbox(gisData)).geometry})
group.getLayers().forEach(i=>{if(i._indexedDBKey!==indexedDBKey)return
updateLeafletGeoJSONLayer(i,{geojson:gisData,updateLocalStorage:false})})
map._drawControl._addChange({type:'edited',features:[{old:feature,new:newFeature}]})}catch(error){console.log(error)}}},pasteGeometry:!feature||!isMapDrawControlLayer?null:{innerText:'Paste geometry',btnCallback:async()=>{const text=await navigator.clipboard.readText()
if(!text)return
try{let newGeom=JSON.parse(text)
if(newGeom.type==='Feature')newGeom=newGeom.geometry
if(!newGeom||!newGeom.coordinates||!newGeom.type)return
let newFeature=structuredClone(feature)
newFeature.geometry=newGeom
newFeature=(await normalizeGeoJSON(turf.featureCollection([newFeature]))).features[0]
const gslId=newFeature.properties.__gsl_id__=feature.properties.__gsl_id__
const{gisData,queryExtent}=await getFromGISDB(indexedDBKey)
gisData.features=[...gisData.features.filter(i=>i.properties.__gsl_id__!==gslId),newFeature]
await saveToGISDB(turf.clone(gisData),{id:indexedDBKey,queryExtent:turf.bboxPolygon(turf.bbox(gisData)).geometry})
group.getLayers().forEach(i=>{if(i._indexedDBKey!==indexedDBKey)return
updateLeafletGeoJSONLayer(i,{geojson:gisData,updateLocalStorage:false})})
map._drawControl._addChange({type:'edited',features:[{old:feature,new:newFeature}]})}catch(error){console.log(error)}}},copy:!feature||isSearch?null:{divider:true,},copyFeature:!feature||isSearch?null:{innerText:'Copy feature',btnCallback:()=>navigator.clipboard.writeText(JSON.stringify(feature))},copyProperties:!feature||isSearch?null:{innerText:'Copy properties',btnCallback:()=>navigator.clipboard.writeText(JSON.stringify(feature.properties))},copyGeometry:!feature||isSearch?null:{innerText:'Copy geometry',btnCallback:()=>navigator.clipboard.writeText(JSON.stringify(feature.geometry))},export:isSearch||!layerGeoJSON?null:{divider:true,},download:isSearch||!layerGeoJSON?null:{innerText:'Download data',btnCallback:()=>{if(layerGeoJSON){downloadGeoJSON(turf.clone(layerGeoJSON),layer._params.title)}}},csv:isSearch||!layerGeoJSON?null:{innerText:`Export centroid${feature ? '' : 's'} to CSV`,btnCallback:()=>{const properties=layerGeoJSON.features.map(f=>f.properties)
const headers=[...Array.from(new Set(properties.flatMap(prop=>Object.keys(prop))))]
const rows=properties.map(prop=>headers.map(header=>{const value=prop[header]!==undefined?prop[header]:''
return`"${String(value).replaceAll(/"/g, '""')}"`}).join(','))
const csv=[headers.join(','),...rows].join('\n')
const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
const url=URL.createObjectURL(blob)
const a=document.createElement('a')
a.href=url
a.download=`${layer._params.title}.csv`
a.click()
URL.revokeObjectURL(url)}},misc:isSearch?null:{divider:true,},legend:{innerText:(isLegendGroup&&!feature?`Duplicate ${typeLabel}`:'Add to legend'),btnCallback:async()=>{if(isSearch&&geojsonLayer?._addBtn){geojsonLayer._addBtn.click()}else{createLeafletLayer(layer._params,{...(indexedDBKey&&!feature?{indexedDBKey}:{data:layerGeoJSON}),group:(feature||!isLegendGroup)?map._handlers.getLayerGroups().local:group,add:true,properties:isLegendGroup?cloneLeafletLayerStyles(layer):null})}}},addStoredData:feature||!indexedDBKey||group._name==='local'?null:{innerText:`Localize stored data`,btnCallback:async()=>{const data=(await getFromGISDB(indexedDBKey)).gisData
createLeafletLayer({name:layer._params.name,title:layer._params.title},{data,group:map._handlers.getLayerGroups().local,add:true,})}},clearData:feature||!indexedDBKey?null:{innerText:`Clear stored data`,btnCallback:async()=>{deleteFromGISDB(geojsonLayer._indexedDBKey)}},remove:!isLegendGroup||isLegendFeature?null:{innerText:`Remove ${typeLabel}`,keepMenuOn:true,btnCallback:(e)=>{const parentElement=e.target.parentElement
parentElement.innerHTML=''
const btn=document.createElement('button')
btn.className='dropdown-item bg-danger border-0 btn btn-sm fs-12'
btn.addEventListener('click',()=>group._handlers.clearLayer(layer))
parentElement.appendChild(btn)
const label=createSpan('Confirm to remove layer',{className:'pe-none text-wrap'})
btn.appendChild(label)}},})};const toggleLeafletLayerEditor=async(layer,{indexedDBKey,}={})=>{const map=layer?._group?._map
if(!map)return
const editableLayer=map._drawControl?._targetLayer
const enableEditor=editableLayer?._indexedDBKey!==layer._indexedDBKey
const mapContainer=map.getContainer()
const layerLegends=document.querySelector(`#${mapContainer.id}-panels-legend-layers`)
const localLayers=layer._group._handlers.getAllLayers()
if(editableLayer){const[id,version]=editableLayer._indexedDBKey.split('--version')
const drawControlChanges=JSON.parse(localStorage.getItem(`draw-control-changes-${mapContainer.id}`)??'[]')
const previousKey=`${id}--version${Number(version ?? 2)-1}`
const endEditingSession=(indexedDBKey)=>{if(indexedDBKey!==editableLayer._indexedDBKey){deleteFromGISDB(editableLayer._indexedDBKey)}
localLayers.forEach(i=>{const legend=layerLegends.querySelector(`#${layerLegends.id}-${i._leaflet_id}`)
Array.from(legend.querySelectorAll(`.bi.bi-pencil-square`)).forEach(i=>i.remove())
if(!i._indexedDBKey.startsWith(id))return
i._indexedDBKey=indexedDBKey})}
if(!drawControlChanges.length){endEditingSession(previousKey)}else if(layer._group._handlers.getAllLayers().includes(editableLayer)){const alertPromise=new Promise((resolve,reject)=>{const alert=createModal({titleText:'Save layer changes?',parent:document.body,show:true,static:true,closeBtn:false,centered:true,contentBody:customCreateElement({className:'p-3',innerHTML:`Do you want to save the ${formatNumberWithCommas(drawControlChanges.length)} change${drawControlChanges.length > 1 ? 's' : ''} made in "${editableLayer._params.title}"?`}),footerBtns:{continue:createButton({className:`btn-secondary`,innerText:'Continue editing',attrs:{'data-bs-dismiss':'modal'},events:{click:(e)=>{alert?.remove()
resolve()}},}),discard:createButton({className:`btn-danger ms-auto`,innerText:'Discard',attrs:{'data-bs-dismiss':'modal'},events:{click:(e)=>{alert?.remove()
resolve(previousKey)}},}),save:createButton({className:`btn-success`,innerText:'Save',attrs:{'data-bs-dismiss':'modal'},events:{click:(e)=>{alert?.remove()
resolve(editableLayer._indexedDBKey)}},}),}})})
const newIndexedDBKey=await alertPromise
if(newIndexedDBKey){endEditingSession(newIndexedDBKey)}else{return}}}
if(enableEditor){const[id,version]=layer._indexedDBKey.split('--version')
const{gisData,queryExtent}=(await getFromGISDB(layer._indexedDBKey))??{gisData:turf.featureCollection([]),queryExtent:turf.feature([]).geometry,}
const newIndexedDBKey=indexedDBKey??await saveToGISDB(gisData,{id:`${id}--version${Number(version ?? 1)+1}`,queryExtent,})
localLayers.forEach(i=>{if(!i._indexedDBKey.startsWith(id))return
i._indexedDBKey=newIndexedDBKey
const legend=layerLegends.querySelector(`#${layerLegends.id}-${i._leaflet_id}`)
if(legend.querySelector(`.bi.bi-pencil-square`))return
const title=legend.querySelector(`#${legend.id}-title`)
title.lastChild.insertBefore(createIcon({preNone:false,className:'bi bi-pencil-square',title:'Active editing sessions',}),title.lastChild.firstChild)})}
await handleLeafletDrawBtns(map,{include:enableEditor,targetLayer:layer})
map._handlers.updateStoredLegendLayers()
localLayers.forEach(i=>{if(![editableLayer,layer].map(i=>i?._indexedDBKey).includes(i._indexedDBKey))return
updateLeafletGeoJSONLayer(i,{updateLocalStorage:false})})};const handleLeafletLayerGroups=async(map)=>{map._layerGroups={}
Array('library','local','query','search').forEach(groupName=>{const group=L.layerGroup()
map._layerGroups[groupName]=group
group._name=groupName
group._hiddenLayers=[]
group._invisibileLayers=[]
group._hiddenGroupLayers=[]
group._handlers={getHiddenGroupLayers:()=>group._hiddenGroupLayers,getHiddenGroupLayer:(id)=>group._handlers.getHiddenGroupLayers().find(l=>l._leaflet_id===parseInt(id)),hasHiddenGroupLayer:(layer)=>group._handlers.getHiddenGroupLayers().includes(layer),unhideGroupLayer:async(layer,{addLayer=true}={})=>{let match
const hiddenLayers=group._handlers.getHiddenGroupLayers().filter(l=>{const matched=l===layer
if(matched){match=l}
return!matched})
group._hiddenGroupLayers=hiddenLayers
if(addLayer){group.addLayer(layer)}else if(match){map.fire('layerremove',{layer})}},hideGroupLayer:(layer)=>{if(!group._hiddenGroupLayers.includes(layer))group._hiddenGroupLayers.push(layer)
group._map.hasLayer(layer)?group.removeLayer(layer):map.fire('layerremove',{layer})},getHiddenLayers:()=>group._hiddenLayers,setHiddenLayers:(hiddenLayers=[])=>group._hiddenLayers=hiddenLayers,hideLayer:(layer)=>{if(!group._hiddenLayers.includes(layer))group._hiddenLayers.push(layer)
if(group._map.hasLayer(layer)){group.removeLayer(layer)}else{map.fire('layerremove',{layer})}},getHiddenLayer:(id)=>group._handlers.getHiddenLayers().find(l=>l._leaflet_id===parseInt(id)),hasHiddenLayer:(layer)=>group._handlers.getHiddenLayers().includes(layer),unhideLayer:async(layer,{addLayer=true}={})=>{let match
const hiddenLayers=group._handlers.getHiddenLayers().filter(l=>{const matched=l===layer
if(matched){match=l}
return!matched})
group._handlers.setHiddenLayers(hiddenLayers)
if(addLayer){group.addLayer(layer)}else if(match){map.fire('layerremove',{layer})}},getInvisibleLayers:()=>group._invisibileLayers,getInvisibleLayer:(id)=>{return group._handlers.getInvisibleLayers().find(l=>l._leaflet_id===parseInt(id))},setInvisibleLayers:(invisibleLayers=[])=>group._invisibileLayers=invisibleLayers,hasInvisibleLayer:(layer)=>group._handlers.getInvisibleLayers().includes(layer),addInvisibleLayer:(layer)=>{group._invisibileLayers.push(layer)
if(group._map.hasLayer(layer)){group.removeLayer(layer)}else{map.fire('layerremove',{layer})}},removeInvisibleLayer:async(layer,{addLayer=true}={})=>{let match
const invisibleLayers=group._handlers.getInvisibleLayers().filter(l=>{const matched=l===layer
if(matched)match=l
return!matched})
group._handlers.setInvisibleLayers(invisibleLayers)
if(addLayer&&!group._handlers.hasHiddenLayer(layer)){group.addLayer(layer)}else if(match){map.fire('layerremove',{layer})}},getAllLayers:()=>{return[...group.getLayers(),...group._handlers.getHiddenLayers(),...group._handlers.getInvisibleLayers(),...group._handlers.getHiddenGroupLayers(),]},findLayer:(id)=>{return group.getLayer(id)??group._handlers.getHiddenLayer(id)??group._handlers.getInvisibleLayer(id)??group._handlers.getHiddenGroupLayer(id)},clearLayer:async(layer)=>{if(group._map.hasLayer(layer))group.removeLayer(layer)
await group._handlers.unhideLayer(layer,{addLayer:false})
await group._handlers.unhideGroupLayer(layer,{addLayer:false})
await group._handlers.removeInvisibleLayer(layer,{addLayer:false})
const paneName=layer.options.pane
if(paneName.startsWith('custom')){deletePane(map,paneName)}
if(groupName==='local'&&!map._handlers.getAllLegendLayers().find(i=>i._indexedDBKey===layer._indexedDBKey)){if(layer._indexedDBKey===map._drawControl?._targetLayer?._indexedDBKey){toggleLeafletLayerEditor(layer)}}},clearAllLayers:async()=>{group._handlers.getAllLayers().forEach(async l=>{await group._handlers.clearLayer(l)})},hideAllLayers:()=>{Array(...group.getLayers(),...group._handlers.getInvisibleLayers(),...group._handlers.getHiddenGroupLayers(),).forEach(l=>{group._handlers.hideLayer(l)})},removeAllHiddenLayers:()=>{group._handlers.getHiddenLayers().forEach(l=>group._handlers.unhideLayer(l))},}
map.addLayer(group)})
map._handlers={storedLegendLayersKey:`legend-layers-${map.getContainer().id}`,getStoredLegendLayers:()=>JSON.parse(localStorage.getItem(map._handlers.storedLegendLayersKey)??'{}'),updateStoredLegendLayers:({handler,layer}={})=>{const storedData=map._handlers.getStoredLegendLayers()
const updateStoredLayerData=(layer)=>{try{storedData[layer._leaflet_id]={...(storedData[layer._leaflet_id]??{}),...{indexedDBKey:layer._indexedDBKey,params:layer._params,properties:layer._properties,zIndex:map.getPanes()[layer.options.pane].style.zIndex,isHidden:map._handlers.hasHiddenLegendLayer(layer)?true:false,editable:layer._indexedDBKey===map._drawControl?._targetLayer?._indexedDBKey,}}}catch(error){console.log(error,layer)}}
if(layer)updateStoredLayerData(layer)
if(handler)handler(storedData)
if(!layer&&!handler)map._handlers.getAllLegendLayers().forEach(layer=>{updateStoredLayerData(layer)})
localStorage.setItem(map._handlers.storedLegendLayersKey,JSON.stringify(storedData))},addStoredLegendLayers:async()=>{const storedData=map._handlers.getStoredLegendLayers()
localStorage.removeItem(map._handlers.storedLegendLayersKey)
const cachedLayers=Object.values(storedData).sort((a,b)=>Number(a.zIndex)-Number(b.zIndex))
for(i of cachedLayers){await map._handlers.addLegendLayer(i)}},addLegendLayer:async(layerData)=>{let{indexedDBKey,params,properties,isHidden,data,editable}=layerData
const group=map._handlers.getLayerGroups()[(indexedDBKey.startsWith('local')?'local':'library')]
for(const i of Array(properties.symbology?.default,...Object.values(properties.symbology?.groups??{}))){if(i?.styleParams?.fillPattern!=='icon')continue
await handleStyleParams(i.styleParams)}
if(data){const id=JSON.parse(indexedDBKey.split('--version')[0].split(';')[1]).id
if(!(await getAllGISDBKeys()).find(i=>i.includes(id))){const{gisData,queryExtent}=data
await saveToGISDB(gisData,{id:indexedDBKey,queryExtent})}}
const layer=await createLeafletLayer(params,{indexedDBKey,group,add:false,properties})
if(layer){if(isHidden)group._handlers.hideLayer(layer)
const legendGroup=properties.legendGroup??{}
if(!Array(undefined,'layers').includes(legendGroup.id)&&legendGroup.checked===false)group._handlers.hideGroupLayer(layer)
group.addLayer(layer)
if(editable&&(indexedDBKey!==map._drawControl?._targetLayer?._indexedDBKey)){await toggleLeafletLayerEditor(layer,{indexedDBKey})}}},getLayerGroups:()=>{return map._layerGroups},getLayerGroup:(layer)=>{for(const group of Object.values(map._handlers.getLayerGroups())){if(group.hasLayer(layer)||group._handlers.hasHiddenLayer(layer)||group._handlers.hasInvisibleLayer(layer)||group._handlers.hasHiddenLegendGroupLayer(layer)){return group}}},hasLegendLayer:(layer)=>{for(const group of map._legendLayerGroups){if(group._handlers.getAllLayers().includes(layer)){return group}}},hasHiddenLegendLayer:(layer)=>{for(const group of map._legendLayerGroups){if(group._handlers.hasHiddenLayer(layer))return group}},hasHiddenLegendGroupLayer:(layer)=>{for(const group of map._legendLayerGroups){if(group._handlers.hasHiddenGroupLayer(layer))return group}},hasInvisibleLegendLayer:(layer)=>{for(const group of map._legendLayerGroups){if(group._handlers.hasInvisibleLayer(layer))return group}},getLegendLayer:(id)=>{for(const group of map._legendLayerGroups){const layer=group._handlers.findLayer(id)
if(layer)return layer}},getLegendLayers:()=>{let layers=[]
for(const group of map._legendLayerGroups){layers=[...layers,...group._handlers.getAllLayers(),]}
return layers},clearLegendLayers:async()=>{map._legendLayerGroups.forEach(async group=>{await group._handlers.clearAllLayers()})},hideLegendLayers:()=>{for(const group of map._legendLayerGroups){group._handlers.hideAllLayers()}},showLegendLayers:()=>{for(const group of map._legendLayerGroups){group._handlers.removeAllHiddenLayers()}},getAllLegendLayers:()=>{let layers=[]
map._legendLayerGroups.forEach(group=>{layers=layers.concat(group._handlers.getAllLayers())})
return layers},zoomToLegendLayers:async()=>{const layers=map._handlers.getAllLegendLayers()
const bounds=(await Promise.all(layers.map(async layer=>{const bbox=await getLeafletLayerBbox(layer)
const b=L.geoJSON(turf.bboxPolygon(bbox)).getBounds()
if(!b)return
try{if(b.getNorth()===b.getSouth()&&b.getEast()===b.getWest()){return turf.point([b.getEast(),b.getNorth()])}else{return L.rectangle(b).toGeoJSON()}}catch(error){return}}))).filter(i=>i)
if(!bounds.length)return
await zoomToLeafletLayer(L.geoJSON(turf.featureCollection(bounds)),map)},}
map._legendLayerGroups=Object.values(map._handlers.getLayerGroups()).filter(g=>['library','local'].includes(g._name))
const queryPane=map.createPane('queryPane')
queryPane.style.zIndex=598
const searchPane=map.createPane('searchPane')
searchPane.style.zIndex=599};const createLeafletMapPanel=(map,parent,name,{statusBar=false,spinnerRemark='',clearLayersHandler,toolHandler,}={})=>{const template={}
const mapContainer=map.getContainer()
const baseId=`${mapContainer.id}-panels-${name}`
const toolbar=document.createElement('div')
toolbar.id=`${baseId}-toolbar`
toolbar.className='d-flex px-3 py-2 flex-wrap'
parent.appendChild(toolbar)
template.toolbar=toolbar
const layers=document.createElement('div')
layers.id=`${baseId}-layers`
layers.className=`flex-grow-1 overflow-auto p-3 d-none border-top rounded-bottom text-bg-${getPreferredTheme()} d-flex flex-column gap-2`
layers.style.minHeight='90px'
parent.appendChild(layers)
template.layers=layers
if(statusBar){const status=document.createElement('div')
status.id=`${baseId}-status`
status.className='d-flex flex-column'
parent.appendChild(status)
template.status=status
const spinner=document.createElement('div')
spinner.id=`${status.id}-spinner`
spinner.className='p-3 border-top d-none gap-2 flex-nowrap d-flex align-items-center justify-content-end'
status.appendChild(spinner)
template.spinner=spinner
const spinnerIcon=document.createElement('div')
spinnerIcon.className='spinner-border spinner-border-sm'
spinnerIcon.setAttribute('role','status')
spinner.appendChild(spinnerIcon)
const spinnerRemarkDiv=customCreateElement({parent:spinner,innerText:spinnerRemark,})
const error=document.createElement('div')
error.id=`${status.id}-error`
error.className='p-3 border-top d-none gap-2 flex-nowrap d-flex align-items-center'
status.appendChild(error)
template.error=error
const errorIcon=document.createElement('div')
errorIcon.className='bi bi-exclamation-triangle-fill'
error.appendChild(errorIcon)
const errorRemarkDiv=document.createElement('div')
error.appendChild(errorRemarkDiv)}
template.clearLayers=async(tools)=>{layers.innerHTML=''
layers.classList.add('d-none')
await clearLayersHandler?.()
for(const tool in tools){const data=tools[tool]
if(data.disabled){toolbar.querySelector(`#${toolbar.id}-${tool}`).disabled=true}}
if(statusBar){parent.querySelector(`#${baseId}-status-spinner`).classList.add('d-none')
parent.querySelector(`#${baseId}-status-error`).classList.add('d-none')}}
template.toolsHandler=(tools)=>{Object.keys(tools).forEach(toolId=>{const data=tools[toolId]
if(data.altShortcut&&data.title)data.title=`${data.title} (alt+${data.altShortcut})`
const tag=data.tag||'button'
const element=tag!=='button'?customCreateElement({...data,tag}):createButton({...data,id:`${toolbar.id}-${toolId}`,className:data.className??`btn-sm btn-${getPreferredTheme()}`,events:{click:async(event)=>{L.DomEvent.stopPropagation(event);L.DomEvent.preventDefault(event);const btn=event.target
const[panelName,currentMode]=map._panelMode||[]
const activate=currentMode!==toolId
const mapClickHandler=activate?data.mapClickHandler:null
const btnClickHandler=activate?data.btnClickHandler:null
const skipToolHandler=!toolHandler||data.toolHandler===false
if(activate&&currentMode){document.querySelector(`#${mapContainer.id}-panels-${panelName}-toolbar-${currentMode}`).click()}
if(!skipToolHandler){btn.classList.toggle('btn-primary',mapClickHandler)
btn.classList.toggle(`btn-${getPreferredTheme()}`,!mapClickHandler)}
mapContainer.style.cursor=(mapClickHandler||map._featureSelector)?'pointer':''
map._panelMode=[name,mapClickHandler?toolId:undefined]
if(mapClickHandler){const panelMapClickHandler=async(e)=>{if(isLeafletControlElement(e.originalEvent.target)||map._panelMode[1]!==toolId)return
map.off('click',panelMapClickHandler)
if(!map._featureSelector){enableLeafletLayerClick(map)}
skipToolHandler?await mapClickHandler():await toolHandler(e,mapClickHandler)
if(btn.classList.contains('btn-primary'))btn.click()}
disableLeafletLayerClick(map)
map.on('click',panelMapClickHandler)}else{if(!map._featureSelector){enableLeafletLayerClick(map)}
map._events.click=map._events.click?.filter(handler=>{return handler.fn.name!=='panelMapClickHandler'})}
if(btnClickHandler){skipToolHandler?await btnClickHandler(event):await toolHandler(event,btnClickHandler)}}}})
if(data.altShortcut)document.addEventListener('keydown',(e)=>{if(e.altKey&&e.key===data.altShortcut){L.DomEvent.preventDefault(e)
element.click()}})
toolbar.appendChild(element)})
return tools}
return template}
const leafletMapLegendLayersToSelectOptions=(map,select,{layer,validators=[],}={})=>{select.innerHTML=''
const mapContainer=map.getContainer()
const legendContainer=mapContainer.querySelector(`#${mapContainer.id}-panels-legend-layers`)
const legends=legendContainer.querySelectorAll(`[data-layer-legend="true"]`)
const option=document.createElement('option')
option.value='-1'
option.text='Select a layer'
select.appendChild(option)
Array.from(legends).map(l=>{const leafletId=parseInt(l.dataset.layerId)
return map._handlers.getLegendLayer(leafletId)}).forEach(l=>{if(validators.length&&validators.every(v=>!v(l)))return
const option=document.createElement('option')
option.className='text-wrap text-break text-truncate'
option.value=l._leaflet_id
option.text=l._params.title
if(layer&&layer._leaflet_id===l._leaflet_id){option.setAttribute('selected',true)}
select.appendChild(option)})}
const handleLeafletMapPanels=async(map)=>{const mapContainer=map.getContainer()
if(mapContainer.parentElement.dataset.mapPanels!=='true')return
const control=L.control({position:'topright'})
control.onAdd=(map)=>{const panel=L.DomUtil.create('div','map-panel')
panel.classList.add('d-flex','flex-column')
const[toggle,body]=findLayersPanels(mapContainer)
panel.appendChild(toggle)
panel.appendChild(body)
handleLeafletQueryPanel(map,body.querySelector(`#${body.id}-accordion-query .accordion-body`))
handleLeafletLegendPanel(map,body.querySelector(`#${body.id}-accordion-legend .accordion-body`))
handleLeafletStylePanel(map,body.querySelector(`#${body.id}-accordion-style .accordion-body`))
handleLeafletToolboxPanel(map,body.querySelector(`#${body.id}-accordion-toolbox .accordion-body`))
return panel}
control.addTo(map)};const updateLayerLegendProperties=(map)=>{const layers=map.getContainer().querySelector(`#${map.getContainer().id}-panels-legend-layers`)
const legendUpdate={}
const layerLegends=Array.from(layers.querySelectorAll('[data-layer-legend="true"]')).reverse()
for(let i=0;i<layerLegends.length;i++){const child=layerLegends[i]
const paneName=child.dataset.layerPane
const pane=map.getPane(paneName)
pane.style.zIndex=i+200
legendUpdate[child.dataset.layerId]={zIndex:pane.style.zIndex,legendGroup:{id:child.parentElement.id.split('-').reverse()[0],title:child.closest('[data-layer-legend="false"')?.firstChild.firstChild.nextElementSibling.innerText,checked:child.closest('[data-layer-legend="false"')?.firstChild.querySelector('.form-check-input').checked}}}
map._handlers.updateStoredLegendLayers({handler:(i)=>Object.keys(legendUpdate).forEach(j=>{i[j].zIndex=legendUpdate[j].zIndex
i[j].properties.legendGroup=legendUpdate[j].legendGroup})})}
const toggleLeafletLegendGroup=(map,layerGroup)=>{const groupId=layerGroup.closest('[data-layer-legend="false"]').lastChild.id.split('-').reverse()[0]
map._handlers.updateStoredLegendLayers({handler:(i)=>Object.keys(i).forEach(j=>{if(i[j]?.properties?.legendGroup?.id!==groupId)return
i[j].properties.legendGroup.checked=layerGroup.checked
const layer=map._handlers.getLegendLayer(j)
const group=layer._group
layerGroup.checked?group._handlers.unhideGroupLayer(layer):group._handlers.hideGroupLayer(layer)})})}
const createNewGroup=(map,{groupId=generateRandomString(),titleText='New Group',checked=true,clearLayers,}={})=>{const layers=map.getContainer().querySelector(`#${map.getContainer().id}-panels-legend-layers`)
const container=customCreateElement({id:`${layers.id}-${groupId}-container`,attrs:{'data-layer-legend':false},className:'d-flex flex-nowrap flex-column gap-1 position-relative user-select-none',})
layers.insertBefore(container,layers.firstChild)
const head=customCreateElement({parent:container,className:'d-flex flex-nowrap gap-2',})
const groupToggle=createFormCheck({parent:head,checked,events:{click:(e)=>toggleLeafletLegendGroup(map,e.target)}})
const title=customCreateElement({parent:head,tag:'span',className:'text-break text-wrap user-select-none',innerText:titleText})
const menu=customCreateElement({parent:head,className:'ms-auto ps-5 d-flex flex-nowrap gap-2'})
const collapseToggle=customCreateElement({parent:menu,tag:'i',className:'dropdown-toggle',attrs:{'data-bs-toggle':"collapse",'data-bs-target':`#${layers.id}-${groupId}`,'aria-controls':`${layers.id}-${groupId}`,'aria-expanded':"true",'style':"cursor: pointer;"}})
const menuToggle=customCreateElement({parent:menu,tag:'i',className:'bi bi-three-dots',attrs:{'style':"cursor: pointer;"},events:{click:(e)=>{contextMenuHandler(e,{toggle:{innerText:'Toggle layers',btnCallback:async(e)=>{const legendChecks=Array.from(collapse.querySelectorAll('.form-check-input'))
const show=legendChecks.every(i=>!i.checked)
legendChecks.forEach(i=>{if(i.checked!==show){i.click()}})}},reverse:{innerText:'Reverse checked layers',btnCallback:async(e)=>{const legendChecks=Array.from(collapse.querySelectorAll('.form-check-input'))
legendChecks.forEach(i=>{i.click()})}},rename:{innerText:'Rename group',btnCallback:async(e)=>{const form=customCreateElement({className:'d-flex flex-nowrap gap-2',})
const field=customCreateElement({parent:form,tag:'input',attrs:{type:'text',value:title.innerText},className:'form-control form-control-sm',events:{change:(e)=>{if(e.target.value.trim()===''){e.target.value=title.innerText}},blur:(e)=>{const value=field.value.trim()
if(value===title.innerText.trim())return
title.innerText=value
map._handlers.updateStoredLegendLayers({handler:(i)=>Object.keys(i).forEach(j=>{if(i[j].properties.legendGroup.id!==groupId)return
i[j].properties.legendGroup.title=value})})
head.insertBefore(title,form)
form.remove()}}})
head.insertBefore(form,title)
field.focus()
title.remove()}},remove:{innerText:'Remove group',keepMenuOn:true,btnCallback:(e)=>{const parentElement=e.target.parentElement
parentElement.innerHTML=''
const btn=document.createElement('button')
btn.className='dropdown-item bg-danger border-0 btn btn-sm fs-12'
btn.addEventListener('click',()=>{const groupLayers=Array.from(collapse.children).map(i=>i._leafletLayer)
groupLayers.forEach(l=>{l._group._handlers.clearLayer(l)})
container.remove()
if(layers.innerHTML===''){clearLayers()}})
parentElement.appendChild(btn)
const label=createSpan('Confirm to remove group and sublayers',{className:'pe-none text-wrap'})
btn.appendChild(label)}},})}}})
const collapse=customCreateElement({parent:container,id:`${layers.id}-${groupId}`,className:'collapse show ps-4',style:{minHeight:'20px'}})
Array('mousedown','touchstart').forEach(t1=>{let elementsFromPoint
let referenceLegend
title.addEventListener(t1,(e1)=>{const startY=e1.type==='touchstart'?e1.touches[0].clientY:e1.clientY
container.classList.add('highlight','z-3')
document.body.classList.add('user-select-none')
layers.classList.remove('overflow-auto')
layers.classList.add('overflow-hidden')
const mouseMoveHandler=(e2)=>{const newX=e2.type==='touchmove'?e2.touches[0].clientX:e2.clientX
const newY=e2.type==='touchmove'?e2.touches[0].clientY:e2.clientY
container.style.top=`${newY - startY}px`
elementsFromPoint=document.elementsFromPoint(newX,newY)
const selector=`[data-layer-legend="false"], #${layers.id} > [data-layer-legend="true"]`
referenceLegend=elementsFromPoint.find(el=>{if(el===container)return
return el.matches(selector)})
Array.from(layers.querySelectorAll(selector)).forEach(el=>el.classList.toggle('highlight',Array(referenceLegend,container).includes(el)))}
const mouseUpHandler=(e3)=>{const offset=parseInt(container.style.top)
if(Math.abs(offset)>=10){if(offset<0){if(referenceLegend){referenceLegend.parentElement.insertBefore(container,referenceLegend)}else{layers.insertBefore(container,layers.firstChild)}}else{if(referenceLegend){if(referenceLegend.nextSibling){referenceLegend.parentElement.insertBefore(container,referenceLegend.nextSibling)}else{referenceLegend.parentElement.appendChild(container)}}else{layers.appendChild(container)}}
Array.from(layers.querySelectorAll('[data-layer-legend]')).forEach(child=>child.style.top='0px')
updateLayerLegendProperties(map)}
container.style.top='0px'
container.classList.remove('z-3')
Array.from(layers.querySelectorAll('.highlight')).forEach(c=>c.classList.remove('highlight'))
document.body.classList.remove('user-select-none')
layers.classList.remove('overflow-hidden')
layers.classList.add('overflow-auto')}
Array('mousemove','touchmove').forEach(t2=>document.addEventListener(t2,mouseMoveHandler))
Array('mouseup','touchend').forEach(t3=>document.addEventListener(t3,(e3)=>{mouseUpHandler(e3)
Array('mousemove','touchmove').forEach(i=>document.removeEventListener(i,mouseMoveHandler))
Array('mouseup','touchend').forEach(i=>document.removeEventListener(i,mouseUpHandler))}))})})
return collapse}
const createLeafletLegendItem=(layer,{clearLayers}={})=>{const group=layer._group
const map=group._map
const layers=map.getContainer().querySelector(`#${map.getContainer().id}-panels-legend-layers`)
const paneName=layer.options.pane
const pane=map.getPane(paneName)
if(pane)pane.style.zIndex=(Array.from(layers?.querySelectorAll('[data-layer-legend="true"]'))??[]).length+200
const container=customCreateElement({tag:'div',id:`${layers.id}-${layer._leaflet_id}`,className:`d-flex flex-nowrap flex-column gap-1 mb-2 position-relative ${layer?._properties?.info?.showLegend === false ? 'd-none' : ''}`,attrs:{'data-layer-legend':"true",'data-layer-pane':paneName,'data-layer-id':layer._leaflet_id,}})
layer._legendContainer=container
container._leafletLayer=layer
const legendGroup=layer._properties.legendGroup
if([undefined,'layers'].includes(legendGroup?.id)){layers.insertBefore(container,layers.firstChild)}else{let groupElement=layers.querySelector(`#${layers.id}-${legendGroup.id}`)
if(!groupElement){groupElement=createNewGroup(map,{groupId:legendGroup.id,titleText:legendGroup.title,checked:legendGroup.checked,clearLayers,})
groupElement.appendChild(container)}else{groupElement.insertBefore(container,groupElement.firstChild)}}
const legendTitle=customCreateElement({tag:'div',id:`${container.id}-title`,className:'d-flex flex-nowrap gap-2',parent:container,innerHTML:createSpan(layer._params.title??'new layer',{className:'text-break text-wrap user-select-none'}).outerHTML})
const layerToggle=createFormCheck({checked:!map._handlers.hasHiddenLegendLayer(layer),events:{click:(e)=>{e.target.checked?group._handlers.unhideLayer(layer):group._handlers.hideLayer(layer)}}})
legendTitle.insertBefore(layerToggle,legendTitle.firstChild)
Array('mousedown','touchstart').forEach(t1=>{let elementsFromPoint
let referenceLegend
legendTitle.firstChild.nextElementSibling.addEventListener(t1,(e1)=>{const startY=e1.type==='touchstart'?e1.touches[0].clientY:e1.clientY
container.classList.add('highlight','z-3')
document.body.classList.add('user-select-none')
layers.classList.remove('overflow-auto')
layers.classList.add('overflow-hidden')
const mouseMoveHandler=(e2)=>{const newX=e2.type==='touchmove'?e2.touches[0].clientX:e2.clientX
const newY=e2.type==='touchmove'?e2.touches[0].clientY:e2.clientY
container.style.top=`${newY - startY}px`
elementsFromPoint=document.elementsFromPoint(newX,newY)
referenceLegend=(elementsFromPoint.find(el=>el.matches(`[data-layer-legend="true"]:not([data-layer-id="${layer._leaflet_id}"]`))??elementsFromPoint.find(el=>el.matches(`[data-layer-legend="false"] > .collapse`))??elementsFromPoint.find(el=>el.matches(`[data-layer-legend="false"]`)))
Array.from(layers.querySelectorAll('[data-layer-legend], [data-layer-legend="false"] > .collapse')).forEach(c=>c.classList.toggle('highlight',Array(referenceLegend,container).includes(c)))}
const mouseUpHandler=(e3)=>{const offset=parseInt(container.style.top)
if(Math.abs(offset)>=10){if(referenceLegend?.matches('[data-layer-legend="false"] > .collapse')){referenceLegend.appendChild(container)}else{if(offset<0){if(referenceLegend){referenceLegend.parentElement.insertBefore(container,referenceLegend)}else{layers.insertBefore(container,layers.firstChild)}}else{if(referenceLegend){if(referenceLegend.nextSibling){referenceLegend.parentElement.insertBefore(container,referenceLegend.nextSibling)}else{referenceLegend.parentElement.appendChild(container)}}else{layers.appendChild(container)}}}
if(container.parentElement.matches('[data-layer-legend="false"] > .collapse')){if(container.closest(`[data-layer-legend="false"]`).firstChild.querySelector('.form-check-input').checked){group._handlers.unhideGroupLayer(layer)}else{group._handlers.hideGroupLayer(layer)}}else{group._handlers.unhideGroupLayer(layer)}
Array.from(layers.querySelectorAll('[data-layer-legend]')).forEach(child=>child.style.top='0px')
updateLayerLegendProperties(map)}
container.style.top='0px'
container.classList.remove('z-3')
Array.from(layers.querySelectorAll('.highlight')).forEach(c=>c.classList.remove('highlight'))
document.body.classList.remove('user-select-none')
layers.classList.remove('overflow-hidden')
layers.classList.add('overflow-auto')}
Array('mousemove','touchmove').forEach(t2=>document.addEventListener(t2,mouseMoveHandler))
Array('mouseup','touchend').forEach(t3=>document.addEventListener(t3,(e3)=>{mouseUpHandler(e3)
Array('mousemove','touchmove').forEach(i=>document.removeEventListener(i,mouseMoveHandler))
Array('mouseup','touchend').forEach(i=>document.removeEventListener(i,mouseUpHandler))}))})})
const toggleContainer=customCreateElement({tag:'div',className:'ms-auto ps-5 d-flex flex-nowrap gap-2',parent:legendTitle})
const legendCollapse=customCreateElement({tag:'div',id:`${container.id}-collapse`,className:'collapse show ps-4',parent:container})
const legendDetails=customCreateElement({tag:'div',id:`${container.id}-details`,className:'d-flex',parent:legendCollapse})
const legendAttribution=customCreateElement({tag:'div',id:`${container.id}-attribution`,className:`d-flex ${layer?._properties?.info?.showAttribution != false ? '' : 'd-none'}`,innerHTML:layer._params.attribution??'',parent:legendCollapse})
Array.from(legendAttribution.querySelectorAll('a')).forEach(a=>a.setAttribute('target','_blank'))
if(layer._indexedDBKey===map._drawControl?._targetLayer?._indexedDBKey){const editIndicator=createIcon({parent:toggleContainer,peNone:true,attrs:{title:'Active editing sessions',},className:'bi bi-pencil-square'})}
const sourceIndicator=titleToTooltip(customCreateElement({parent:toggleContainer,tag:'i',className:`bi bi-globe ${layer._indexedDBKey.startsWith('local') ? 'text-secondary' : 'text-primary'}`,attrs:{title:`${layer._indexedDBKey.startsWith('local') ? 'Local' : 'Web'} layer`},}))
const collapseToggle=createIcon({parent:toggleContainer,peNone:false,className:'dropdown-toggle',attrs:{'data-bs-toggle':'collapse','data-bs-target':`#${legendCollapse.id}`,'aria-controls':legendCollapse.id,'aria-expanded':'true',}})
const menuToggle=createIcon({parent:toggleContainer,peNone:false,className:'bi bi-three-dots',events:{'click':(e)=>getLeafletLayerContextMenu(e,layer)}})
return container}
const disableLeafletMapSelector=(map)=>{const icon=map.getContainer().querySelector(`#${map.getContainer().id}-panels-legend-toolbar-select i`)
icon.classList.remove('text-primary','bi-geo-alt','bi-bezier2','bi-hexagon')
icon.classList.add('bi-hand-index')
map._featureSelectionCoords=[]
map._featureSelectorLayer.clearLayers()
map.removeLayer(map._featureSelectorLayer)
enableLeafletLayerClick(map)
map._featureSelector=false
map.off('click',leafletMapFeatureSelectionHandler)
map.closePopup()
map.getContainer().style.cursor=''}
const leafletMapFeatureSelectionHandler=(e)=>{if(isLeafletControlElement(e.originalEvent.target))return
const map=e.target
const layers=map.getContainer().querySelector(`#${map.getContainer().id}-panels-legend-layers`)
const coords=Object.values(e.latlng).reverse()
map._featureSelectionCoords.push(coords)
const isPoint=map._featureSelector==='point'
const isLine=map._featureSelector==='line'
const isPolygon=map._featureSelector==='polygon'
let feature
if(isPoint||map._featureSelectionCoords.length===1){feature=turf.point(coords)}else if(isLine||map._featureSelectionCoords.length===2){feature=turf.lineString(map._featureSelectionCoords)}else if(isPolygon&&map._featureSelectionCoords.length>2){feature=turf.polygon([map._featureSelectionCoords.concat([map._featureSelectionCoords[0]])])}
feature.properties.select=!e.originalEvent.ctrlKey
map._featureSelectorLayer.clearLayers()
if(isLine||isPolygon){feature.properties.done=false
map._featureSelectorLayer.addData(feature)
map.addLayer(map._featureSelectorLayer)}else{map._featureSelectorLayer.clearLayers()
map.removeLayer(map._featureSelectorLayer)}
if(isPoint){Array.from(layers.querySelectorAll('[data-layer-legend="true"]')).forEach(legend=>{const layer=legend._leafletLayer
if(!(layer instanceof L.GeoJSON))return
layer.eachLayer(l=>{if(!featuresIntersect(feature,l.feature))return
if(feature.properties.select){layer._handlers.selectFeatureLayer(l)}else{layer._handlers.deselectFeatureLayer(l)}})})}else if((isLine&&map._featureSelectionCoords.length>1)||(isPolygon&&map._featureSelectionCoords.length>2)){const popup=new L.popup(e.latlng,{autoPan:false,closeButton:false,closeOnEscapeKey:false,autoClose:true,className:'m-0'}).setContent(createButton({innerText:isPolygon?'Close polygon':'Finish line',className:'fs-12 p-0',events:{click:()=>{feature.properties.done=true
zoomToLeafletLayer(map._featureSelectorLayer,map)
popup.close()
map._featureSelectionCoords=[]
map.removeLayer(map._featureSelectorLayer)}}})).openOn(map)}}
const handleLeafletLegendPanel=async(map,parent)=>{const{toolbar,layers,clearLayers,toolsHandler,}=createLeafletMapPanel(map,parent,'legend',{clearLayersHandler:async()=>{await map._handlers.clearLegendLayers()
disableStyleLayerSelect()}})
const enableSelector=(selector)=>{const icon=toolbar.querySelector(`#${toolbar.id}-select i`)
icon.classList.remove('bi-hand-index','bi-geo-alt','bi-bezier2','bi-hexagon')
icon.classList.add('text-primary')
if(selector==='point')icon.classList.add('bi-geo-alt')
if(selector==='line')icon.classList.add('bi-bezier2')
if(selector==='polygon')icon.classList.add('bi-hexagon')
map._featureSelectionCoords=[]
map._featureSelectorLayer.clearLayers()
disableLeafletLayerClick(map)
map._featureSelector=selector
map.off('click',leafletMapFeatureSelectionHandler)
map.on('click',leafletMapFeatureSelectionHandler)
map.getContainer().style.cursor='pointer'}
let controller=resetController()
const tools=toolsHandler({zoomin:{iconSpecs:'bi bi-zoom-in',title:'Zoom to layers',disabled:true,btnClickHandler:async()=>await map._handlers.zoomToLegendLayers(),},visibility:{iconSpecs:'bi bi-eye',title:'Toggle visibility',disabled:true,btnClickHandler:()=>{const legendChecks=Array.from(layers.querySelectorAll('.form-check-input'))
const show=legendChecks.every(i=>!i.checked)
if(show){legendChecks.forEach(i=>i.checked=true)
map._handlers.showLegendLayers()}else{legendChecks.forEach(i=>i.checked=false)
map._handlers.hideLegendLayers()}
map._handlers.getAllLegendLayers().forEach(l=>{if(l._legendContainer.parentElement===layers)return
show?l._group._handlers.unhideGroupLayer(l):l._group._handlers.hideGroupLayer(l)})
map._handlers.updateStoredLegendLayers({handler:(i)=>Object.values(i).forEach(j=>{const id=j?.properties?.legendGroup?.id
if(id&&id!=='layers'){j.properties.legendGroup.checked=show}})})},},reverse:{iconSpecs:'bi bi-shuffle',title:'Reverse checked items',disabled:true,btnClickHandler:()=>{const elements=Array.from(layers.querySelectorAll('[data-layer-legend]'))
elements.forEach(el=>{const layer=el._leafletLayer
const group=layer?._group
const checkbox=el.querySelector('.form-check-input')
if(!checkbox.checked||checkbox.getAttribute('type')==='checkbox'){checkbox.click()}else{checkbox.checked=false
if(layer){group._handlers.hideLayer(layer)}else{toggleLeafletLegendGroup(map,checkbox)}}})},},select:{iconSpecs:'bi-hand-index',title:'Select features',disabled:true,btnClickHandler:(e)=>{const menuContainer=contextMenuHandler(e,{selectPoint:{innerText:`Select at point`,btnCallback:async()=>enableSelector('point')},selectLine:{innerText:`Select along line`,btnCallback:async()=>enableSelector('line')},selectPoly:{innerText:`Select by polygon`,btnCallback:async()=>enableSelector('polygon')},selectClipboard:{innerText:`Select by clipboard feature`,btnCallback:async(e)=>{disableLeafletMapSelector(map)
const text=await navigator.clipboard.readText()
if(!text)return
try{let feature=JSON.parse(text)
if(feature.type==='Feature'||Array('Point','LineString','Polygon').some(i=>feature.type.endsWith(i))){feature=feature.type==='Feature'?feature:turf.feature(feature)
feature.properties={done:true,select:!e.ctrlKey,}
map._featureSelectorLayer.addData(feature)
zoomToLeafletLayer(map._featureSelectorLayer,map)}}catch(error){console.log(error)}}},selectOff:!map._featureSelector?null:{innerText:`Deactivate selector`,btnCallback:()=>disableLeafletMapSelector(map)},div:{divider:true,},selectVisible:{innerText:`Select visible features`,btnCallback:async()=>{disableLeafletMapSelector(map)
Array.from(layers.querySelectorAll('[data-layer-legend="true"]')).forEach(legend=>{const layer=legend._leafletLayer
if(!(layer instanceof L.GeoJSON))return
layer.eachLayer(l=>layer._handlers.selectFeatureLayer(l))})}},deselectVisible:{innerText:`Deselect visible features`,btnCallback:async()=>{disableLeafletMapSelector(map)
Array.from(layers.querySelectorAll('[data-layer-legend="true"]')).forEach(legend=>{const layer=legend._leafletLayer
if(!(layer instanceof L.GeoJSON))return
layer.eachLayer(l=>layer._handlers.deselectFeatureLayer(l))})}},deselectAll:{innerText:`Deselect all features`,btnCallback:async()=>{disableLeafletMapSelector(map)
Array.from(layers.querySelectorAll('[data-layer-legend="true"]')).forEach(legend=>{const layer=legend._leafletLayer
if(!(layer instanceof L.GeoJSON))return
layer.eachLayer(l=>layer._handlers.deselectFeatureLayer(l))
layer._selectedFeatures=[]})}},})}},divider3:{tag:'div',className:'vr m-2',},newGroup:{iconSpecs:'bi bi-collection',title:'Create group',disabled:true,btnClickHandler:()=>createNewGroup(map,{clearLayers:()=>{clearLayers(tools)}}),},divider1:{tag:'div',className:'vr m-2',},collapse:{iconSpecs:'bi bi-chevron-up',title:'Collapse/expand',disabled:true,btnClickHandler:()=>toggleCollapseElements(layers),},toggleLegends:{iconSpecs:'bi bi-list-task',title:'Toggle legends',disabled:true,btnClickHandler:()=>{const elements=Array.from(layers.querySelectorAll('[data-layer-legend="true"]'))
const show=elements.some(el=>el.classList.contains('d-none'))
layers.classList.toggle('d-none',!show)
elements.forEach(el=>{el.classList.toggle('d-none',!show)
const layer=map._handlers.getLegendLayer(el.dataset.layerId)
layer._properties.info.showLegend=show
map._handlers.updateStoredLegendLayers({layer})})
const checkbox=getStyleBody().querySelector('[name="showLegend"]')
if(checkbox)checkbox.checked=show},},toggleAttribution:{iconSpecs:'bi bi-c-circle',title:'Toggle attributions',disabled:true,btnClickHandler:()=>{const elements=Array.from(layers?.querySelectorAll('[data-layer-legend="true"]'))
const show=elements.some(el=>el.querySelector(`#${el.id}-attribution`).classList.contains('d-none'))
elements.forEach(el=>{el.querySelector(`#${el.id}-attribution`).classList.toggle('d-none',!show)
const layer=map._handlers.getLegendLayer(el.dataset.layerId)
layer._properties.info.showAttribution=show
map._handlers.updateStoredLegendLayers({layer})})
const checkbox=getStyleBody().querySelector('[name="showAttr"]')
if(checkbox)checkbox.checked=show},},clearLegend:{iconSpecs:'bi-trash-fill',title:'Clear legend layers',disabled:true,btnClickHandler:(e)=>{const menuContainer=contextMenuHandler(e,{all:{innerText:`Remove all layers`,btnCallback:async()=>{clearLayers(tools)}},checked:{innerText:`Remove checked layers`,btnCallback:async()=>{const elements=Array.from(layers.querySelectorAll('[data-layer-legend="true"]'))
if(elements.every(el=>el.querySelector('.form-check-input').checked)){clearLayers(tools)}else{const checked=elements.filter(el=>el.querySelector('.form-check-input').checked)
checked.forEach(el=>{const layer=el._leafletLayer
layer._group._handlers.clearLayer(layer)})}}},unchecked:{innerText:`Remove unchecked layers`,btnCallback:async()=>{const elements=Array.from(layers.querySelectorAll('[data-layer-legend="true"]'))
if(elements.every(el=>!el.querySelector('.form-check-input').checked)){clearLayers(tools)}else{const unchecked=elements.filter(el=>!el.querySelector('.form-check-input').checked)
unchecked.forEach(el=>{const layer=el._leafletLayer
layer._group._handlers.clearLayer(layer)})}}},broken:{innerText:`Remove broken layers`,btnCallback:async()=>{const elements=Array.from(layers.querySelectorAll('[data-layer-legend="true"]'))
if(elements.every(el=>el.querySelector('.bi-bug'))){clearLayers(tools)}else{const broken=elements.filter(el=>el.querySelector('.bi-bug'))
broken.forEach(el=>{const layer=el._leafletLayer
layer._group._handlers.clearLayer(layer)})}}},})}},})
const clearLegend=(layerLegend,{isInvisible=false,error=false}={})=>{if(!layerLegend)return
const legendDetails=layerLegend.querySelector(`#${layerLegend.id}-details`)
legendDetails.innerHTML=''
if(isInvisible){createIcon({className:'bi-eye-slash me-1 mb-2',parent:legendDetails,peNone:false,title:'Beyond visible range',})}
if(error){createIcon({className:'bi-bug me-1 mb-2',parent:legendDetails,peNone:false,title:'Data source error',})}}
const mapContainer=map.getContainer()
const getStyleBody=()=>mapContainer.querySelector(`#${mapContainer.id}-panels-style-body`)
const clearStyleBody=()=>{const styleBody=getStyleBody()
styleBody.innerHTML=''
styleBody.removeAttribute('data-layer-id')
styleBody.classList.add('d-none')}
const disableStyleLayerSelect=(disable=true)=>{const styleAccordionSelector=`#${mapContainer.id}-panels-accordion-style`
const styleAccordion=mapContainer.querySelector(styleAccordionSelector)
const layerSelect=styleAccordion?.querySelector(`select[name="layer"]`)
if(layerSelect)layerSelect.disabled=disable
if(layerSelect&&disable){layerSelect.innerHTML=''
clearStyleBody()}}
const createLegendImage=(layer)=>{const details=layers.querySelector(`#${layers.id}-${layer._leaflet_id}-details`)
details.innerHTML=''
const img=new Image()
img.src=layer._params.legend
img.alt=layer._params.title
img.className='mb-1'
img.style.maxWidth='100%'
details.appendChild(img)}
let timeout
map.on('movestart zoomstart',()=>{clearTimeout(timeout)
controller=resetController({controller,message:'Map moved.'})})
map.on('moveend zoomend',(e)=>{clearTimeout(timeout)
timeout=setTimeout(async()=>{const mapBboxId=`map-bbox-${map.getContainer().id}`
const previousBbox=map._previousBbox??turf.bboxPolygon(JSON.parse(localStorage.getItem(mapBboxId)??'[-180,-90,180,90]'))
const newBbox=turf.bboxPolygon(getLeafletMapBbox(map))
Array.from(document.querySelectorAll(`[data-form-map-id="${map.getContainer().id}"] [data-map-bbox-field="true"]`)).forEach(i=>{i.value=JSON.stringify(newBbox.geometry)})
localStorage.setItem(mapBboxId,JSON.stringify(turf.bbox(newBbox)))
const controllerId=controller.id
const promises=[]
const legendLayers=Array.from(layers?.querySelectorAll('[data-layer-legend="true"]')).reverse().sort((a,b)=>{const aIsLocal=a.querySelector('.bi-globe.text-secondary')?1:0;const aIsURL=a.querySelector('.bi-globe.text-primary')?1:0;const bIsLocal=b.querySelector('.bi-globe.text-secondary')?1:0;const bIsURL=b.querySelector('.bi-globe.text-primary')?1:0;const aScore=aIsLocal*2+aIsURL
const bScore=bIsLocal*2+bIsURL
return bScore-aScore})
for(const legend of legendLayers){if(controllerId!==controller.id)break
const leafletId=parseInt(legend.dataset.layerId)
const layer=map._handlers.getLegendLayer(leafletId)
if(!layer)continue
const isHidden=map._handlers.hasHiddenLegendLayer(layer)
const isInvisible=!leafletLayerIsVisible(layer)
const isInHiddenGroup=map._handlers.hasHiddenLegendGroupLayer(layer)
const bbox=await getLeafletLayerBbox(layer)
const withinBbox=turf.booleanIntersects(newBbox,turf.bboxPolygon(bbox))
if(isHidden||isInHiddenGroup||isInvisible||!withinBbox){if(layer instanceof L.GeoJSON)layer.options.renderer?._container?.classList.add('d-none')
clearLegend(legend,{isInvisible})
continue}
if(layer instanceof L.GeoJSON){const isEditable=layer._indexedDBKey===map._drawControl?._targetLayer?._indexedDBKey
if(isEditable)continue
if(controllerId!==controller.id)break
const mapScale=getLeafletMeterScale(map)
const geojson=(!legend.querySelector('.bi-bug')&&turf.booleanWithin(newBbox,previousBbox)&&layer.getLayers().length===layer._properties.limits.totalCount&&Object.values(layer._properties.transformations).every(i=>!i.inEffect||(i.inEffect&&(!i.scale.active||(i.scale.active&&(mapScale<=i.scale.max)&&(mapScale>=i.scale.min))))))?layer.toGeoJSON():null
promises.push(updateLeafletGeoJSONLayer(layer,{geojson,controller,updateLocalStorage:false,}).then(()=>{if(layer&&layer._openpopup){layer._openpopup.openOn(map)
delete layer._openpopup}}))}else if(layer._params.legend){const details=legend.querySelector(`#${legend.id}-details`)
if(details.innerHTML===''||details.firstChild.tagName==='I'){createLegendImage(layer)}}}
Promise.all(promises).then(()=>{map._previousBbox=newBbox
map._featureSelectorLayer.clearLayers()})},500)})
const toggleLayersVisibility=()=>{layers.classList.toggle('d-none',layers.innerHTML===''||Array.from(layers.querySelectorAll('[data-layer-legend="true"]')).every(el=>el.classList.contains('d-none')))}
map.on('layerremove',(event)=>{const layer=event.layer
if(!map._legendLayerGroups.includes(layer._group))return
const layerLegend=layers.querySelector(`[data-layer-id="${layer._leaflet_id}"]`)
const isHidden=map._handlers.hasHiddenLegendLayer(layer)
const isInvisible=map._handlers.hasInvisibleLegendLayer(layer)
const isInHiddenGroup=map._handlers.hasHiddenLegendGroupLayer(layer)
if((isHidden||isInvisible||isInHiddenGroup)){clearLegend(layerLegend,{isInvisible})
if(layer instanceof L.GeoJSON){layer.options.renderer?._container?.classList.add('d-none')}
map._handlers.updateStoredLegendLayers({layer})}else{if(layerLegend){layerLegend.remove()
toggleLayersVisibility()
if(layers.innerHTML==='')clearLayers(tools)}
const styleLayerId=parseInt(getStyleBody()?.dataset.layerId??-1)
if(styleLayerId===layer._leaflet_id)clearStyleBody()
if(layer instanceof L.GeoJSON)deleteLeafletLayerFillPatterns(layer)
map._handlers.updateStoredLegendLayers({handler:(i)=>delete i[layer._leaflet_id]})}})
map.on('layeradd',(event)=>{const layer=event.layer
if(!map._handlers.hasLegendLayer(layer))return
const isHidden=map._handlers.hasHiddenLegendLayer(layer)
const isInvisible=map._handlers.hasInvisibleLegendLayer(layer)
const isInHiddenGroup=map._handlers.hasHiddenLegendGroupLayer(layer)
const isGeoJSON=layer instanceof L.GeoJSON
let container=layers.querySelector(`#${layers.id}-${layer._leaflet_id}`)
if(!container){container=createLeafletLegendItem(layer,{clearLayers:()=>{clearLayers(tools)}})
const legendDetails=container.querySelector(`#${container.id}-details`)
if(isGeoJSON){layer.on('dataupdating',()=>{legendDetails.innerHTML=''
legendDetails.appendChild(customCreateElement({className:'py-1 d-flex flex-nowrap',innerHTML:'<div class="spinner-border spinner-border-sm" role="status"></div><div class="ms-2"></div>'}))})
layer.fire('dataupdating')
layer.on('dataupdate',()=>{legendDetails.innerHTML=''
if(isUnderenderedLayer(layer))return
createGeoJSONLayerLegend(layer,legendDetails)
const legendMenu=container.firstChild.lastChild
legendMenu.querySelector('i.bi.bi-filter')?.remove()
legendMenu.querySelector('i.bi-circle-square')?.remove()
if(layer._properties.limits.active){legendMenu.insertBefore(titleToTooltip(customCreateElement({tag:'i',className:'bi bi-filter text-secondary',attrs:{title:`Feature count is limited to ${
                                formatNumberWithCommas(layer._properties.limits.max)
                            }. You can change this in the layer properties.`}})),legendMenu.querySelector('.bi-globe'))}
if(Object.values(layer._properties.transformations).some(i=>i.inEffect)){legendMenu.insertBefore(titleToTooltip(customCreateElement({tag:'i',className:'bi bi-circle-square text-secondary',attrs:{title:`Feature geometry is transformed. You can change this in the layer properties.`}})),legendMenu.querySelector('.bi-globe'))}})
layer.on('dataerror',()=>{layer.clearLayers()
clearLegend(container,{error:true})})}}
container.querySelector('.form-check-input').checked=!isHidden
if(isHidden||isInvisible||isInHiddenGroup){map.removeLayer(layer)}else{map._handlers.updateStoredLegendLayers({layer})
if(!isGeoJSON){const details=container.querySelector(`#${container.id}-details`)
if(turf.booleanIntersects((map._previousBbox??turf.bboxPolygon(getLeafletMapBbox(map))),L.rectangle(layer.getBounds()).toGeoJSON())){if(details.innerHTML===''||details.firstChild.tagName==='I'){details.innerHTML=''
if(layer._params.legend){createLegendImage(layer)}}}else{clearLegend(container)}}}
toggleLayersVisibility()
if(layers.innerHTML!==''){disableStyleLayerSelect(false)
for(const tool in tools){const data=tools[tool]
if(data.disabled){toolbar.querySelector(`#${toolbar.id}-${tool}`).disabled=false}}}})
map.on('initComplete',async()=>{if(!Object.keys(map._handlers.getStoredLegendLayers()).length)return
const storedBbox=localStorage.getItem(`map-bbox-${map.getContainer().id}`)
const alertPromise=new Promise((resolve,reject)=>{const alert=createModal({titleText:'Restore map state?',parent:document.body,show:true,static:true,closeBtn:false,centered:true,contentBody:customCreateElement({className:'p-3',innerHTML:`Do you want to restore the previous map extent and layers?`}),footerBtns:{no:createButton({className:`btn-danger ms-auto`,innerText:'No',attrs:{'data-bs-dismiss':'modal','tabindex':'-1'},events:{click:(e)=>{alert.remove()
resolve(false)}},}),yes:createButton({className:`btn-success`,innerText:'Yes',attrs:{'data-bs-dismiss':'modal',autofocus:true},events:{click:(e)=>{alert.remove()
resolve(true)}},}),}})})
const restoreMap=await alertPromise
if(restoreMap){if(storedBbox)map.fitBounds(L.geoJSON(turf.bboxPolygon(JSON.parse(storedBbox))).getBounds())
map._handlers.addStoredLegendLayers().then(()=>{toggleLayersVisibility()})}else{Object.keys(localStorage).forEach(i=>{if(!i.includes(map.getContainer().id))return
localStorage.removeItem(i)})}})};const COLLECTION_FORMATS={'overpass':'Overpass API','osm':'OpenStreetMap','geojson':'GeoJSON','csv':'CSV','gpx':'GPX','kml':'KML','file':'File','xyz':'XYZ Tiles','ogc-wfs':'OGC Web Feature Service','ogc-wms':'OGC Web Map Service',}
const handleLeafletStylePanel=(map,parent)=>{let controller=resetController()
const form=document.createElement('form')
form.className=`d-flex flex-grow-1 flex-column text-bg-${getPreferredTheme()} rounded h-100`
parent.appendChild(form)
const toolbar=document.createElement('div')
toolbar.className='d-flex p-3 flex-c olumn gap-3'
form.appendChild(toolbar)
const select=createInputGroup({parent:toolbar,prefixHTML:'<span class="fs-12">Layer</span>',suffixHTML:`<div class='d-flex flex-nowrap gap-2'></div>`,fieldTag:'select',fieldClass:'form-select-sm',fieldAttrs:{name:'layer'},disabled:true,}).querySelector('select')
const styleOptions=select.nextElementSibling
styleOptions.appendChild(createIcon({peNone:false,className:'bi bi-copy fs-12',events:{click:()=>{navigator.clipboard.writeText(JSON.stringify(layer._properties))}}}))
styleOptions.appendChild(createIcon({peNone:false,className:'ms-3 bi bi-clipboard fs-12',events:{click:async()=>{const text=await navigator.clipboard.readText()
if(!text)return
try{const _properties=JSON.parse(text)
if(!Object.keys(layer._properties).every(i=>{return Object.keys(_properties).includes(i)}))return
const oldStyles=structuredClone(layer._properties)
layer._properties=cloneLeafletLayerStyles({_properties})
deleteLeafletLayerFillPatterns({_properties:oldStyles})
updateLeafletGeoJSONLayer(layer,{geojson:layer.toGeoJSON()})
const event=new Event("change",{bubbles:true})
select.dispatchEvent(event)}catch{return}}}}))
const body=document.createElement('div')
body.id=`${map.getContainer().id}-panels-style-body`
body.className='d-flex flex-column flex-grow-1 overflow-auto p-3 d-none border-top gap-3'
form.appendChild(body)
let layer
const mapContainer=map.getContainer()
const getLayerLegend=()=>mapContainer.querySelector(`#${mapContainer.id}-panels-legend-layers-${layer._leaflet_id}`)
const visibilityFieldsClick=(e)=>{const field=e.target
const changeEvent=new Event('change',{bubbles:true,cancelable:true,})
contextMenuHandler(e,{useCurrent:{innerText:`Use current map scale`,btnCallback:async()=>{const scale=getLeafletMeterScale(map)
field.value=scale
field.dispatchEvent(changeEvent)}},zoomCurrent:{innerText:`Zoom to nearest scale`,btnCallback:async()=>{const scale=field.value
zoomLeafletMapToScale(map,scale)}},useDefault:{innerText:`Use default scale`,btnCallback:async()=>{field.value=field.name.toLowerCase().includes('min')?10:5000000
field.dispatchEvent(changeEvent)}},})}
const updateSymbology=async(styleParams,{refresh=true,updateLocalStorage=true}={})=>{const controllerId=controller.id
await handleStyleParams(styleParams,{controller})
if(refresh&&controllerId===controller.id){updateLeafletGeoJSONLayer(layer,{geojson:layer.toGeoJSON(),controller,updateLocalStorage,}).then(()=>{map.setZoom(map.getZoom())})}
return styleParams}
const getSymbologyForm=(id)=>{const legendLayer=getLayerLegend()
const symbology=layer._properties?.symbology
const style=(symbology?.groups?.[id])||symbology?.default
const styleParams=style?.styleParams
const collapseId=generateRandomString()
let updateTimeout
const update=async()=>{clearTimeout(updateTimeout)
updateTimeout=setTimeout(()=>{updateSymbology(style.active?styleParams:null)
updateTimeout=null},1000)}
const parent=customCreateElement({className:'d-flex flex-column flex-grow-1',})
parent.addEventListener('focusin',(e)=>{if(!updateTimeout)return
if(!e.target.getAttribute('name'))return
update()})
const toggleFields=customCreateElement({className:'d-flex gap-3 align-items-center',parent,})
if(id!==''){const enableGroup=createFormCheck({parent:toggleFields,checked:style.active,formCheckClass:'flex-grow-1',role:'switch',events:{click:(e)=>{const value=e.target.checked
if(value===style.active)return
style.active=value
update()}}})
const rank=createBadgeSelect({parent:toggleFields,selectClass:`ms-auto border-0 p-0 pe-1 text-end text-bg-${getPreferredTheme()}`,attrs:{name:`${id}-rank`},options:(()=>{const options={}
for(let i=0;i<Object.keys(symbology.groups).length;i++){options[i+1]=i+1}
return options})(),currentValue:String(style.rank),events:{change:(e)=>{let value=parseInt(e.target.value)
if(isNaN(value))e.target.value=value=style.rank
if(value===style.rank)return
style.rank=value
update()}}})}else{const defaultLabel=createSpan('Default',{parent:toggleFields,className:'fs-12 fw-medium text-muted user-select-none mb-2',})}
const copyBtn=createIcon({className:`bi bi-copy ${id === '' ? 'ms-auto' : ''}`,parent:toggleFields,peNone:false,title:'Copy group symbology',events:{click:(e)=>{const text=JSON.stringify(styleParams)
navigator.clipboard.writeText(text)}}})
const pasteBtn=createIcon({className:'bi bi-clipboard',parent:toggleFields,peNone:false,title:'Paste group symbology',events:{click:async(e)=>{const text=await navigator.clipboard.readText()
if(!text)return
try{const newStyleParams=getLeafletStyleParams(JSON.parse(text))
if(!Object.keys(styleParams).every(i=>{return Object.keys(newStyleParams).includes(i)}))throw new Error('Invalid style params')
style.styleParams=await updateSymbology({...newStyleParams,fillPatternId:styleParams.fillPatternId},{refresh:style.active})
parent.parentElement.insertBefore(getSymbologyForm(id),parent)
parent.remove()}catch(error){console.log(error)}}}})
if(id!==''){const deleteBtn=createIcon({className:'bi bi-trash-fill text-danger',parent:toggleFields,peNone:false,title:'Remove group',events:{click:(e)=>{const menuContainer=contextMenuHandler(e,{confirm:{innerText:`Confirm to remove group`,btnCallback:async()=>{parent.remove()
document.querySelector(`#${styleParams.fillPatternId}`)?.remove()
delete symbology.groups[id]
style.active=false
update()}},})
menuContainer.classList.add('bg-danger')}}})}
createIcon({className:'dropdown-toggle',parent:toggleFields,peNone:false,attrs:{'data-bs-toggle':'collapse','aria-expanded':style.rank===1?'true':'false','data-bs-target':`#${collapseId}`,'aria-controls':collapseId,},})
const headerFields=customCreateElement({className:'d-flex gap-2 align-items-center mb-2',style:{cursor:'pointer'},parent,})
const label=createFormFloating({parent:headerFields,containerClass:'w-100',fieldAttrs:{name:`${id}-label`,type:'text',value:style.label},labelText:'Label',fieldClass:'form-control-sm',events:{blur:async(e)=>{const value=e.target.value.trim()
if(value===style.label)return
style.label=value
const legendLabel=legendLayer.querySelector(`#${legendLayer.id}-details-table-${id}-title`)
if(legendLabel)legendLabel.innerText=value
map._handlers.updateStoredLegendLayers({layer})}}})
const groupChecks=customCreateElement({className:'d-flex flex-column justify-content-center border px-3 rounded pt-1',parent:headerFields})
const toggleLabel=createFormCheck({parent:groupChecks,labelInnerText:'Show label',checked:style.showLabel,labelClass:'text-nowrap',events:{click:(e)=>{const value=e.target.checked
if(value===style.showLabel)return
style.showLabel=value
legendLayer.querySelector(`#${legendLayer.id}-details-table-${id}-title`)?.classList.toggle('d-none',!value)
map._handlers.updateStoredLegendLayers({layer})}}})
const toggleCount=createFormCheck({parent:groupChecks,labelInnerText:'Show count',checked:style.showCount,labelClass:'text-nowrap',events:{click:(e)=>{const value=e.target.checked
if(value===style.showCount)return
style.showCount=value
legendLayer.querySelector(`#${legendLayer.id}-details-table-${id}-count`)?.classList.toggle('d-none',!value)
map._handlers.updateStoredLegendLayers({layer})}}})
const collapseDiv=customCreateElement({id:collapseId,className:`accordion-collapse collapse ${style.rank === 1 ? 'show' : ''} border-start border-3 ps-2`,attrs:{'data-bs-parent':`#${body.id}-methodDetails`},parent,})
const fieldsContainer=customCreateElement({className:'d-flex flex-column gap-2',parent:collapseDiv,})
const iconFields=customCreateElement({className:'d-flex gap-2',parent:fieldsContainer,})
const iconType=createFormFloating({parent:iconFields,containerClass:'w-10 flex-grow-1',fieldTag:'select',fieldAttrs:{name:`${id}-iconType`},fieldClass:'form-select-sm h-100',labelText:'Icon type',options:{'bi':'bootstrap icon','text':'text','emoji':'emoji','img':'image url','svg':'svg element','html':'html element','property':'feature properties',},currentValue:styleParams.iconType,events:{change:(e)=>{const value=e.target.value
if(value===styleParams.iconType)return
styleParams.iconSpecs=value==='bi'?['circle-fill']:[]
const tagify=Tagify(form.elements[`${id}-iconSpecs`])
tagify.removeAllTags()
value==='bi'?tagify.addTags(['circle-fill']):null
tagify.settings.maxTags=value==='property'?10:1
form.elements[`${id}-iconDelimiter`].parentElement.classList.toggle('d-none',value!=='property')
styleParams.iconType=value
update()}}})
const iconSpecs=createTagifyField({parent:iconFields,inputClass:`w-25 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1`,inputTag:'textarea',maxTags:styleParams.iconType==='property'?10:1,enforceWhitelist:false,delimiters:null,enabled:0,disabled:false,dropdownClass:`my-1 border-0`,userInput:true,scopeStyle:{minHeight:'58px'},name:`${id}-iconSpecs`,placeholder:'Add icon specifications',currentValue:JSON.stringify((styleParams.iconSpecs||[]).map(i=>{return{value:i}})),events:{click:async(e)=>{const tagify=Tagify(form.elements[`${id}-iconSpecs`])
let options=[]
const iconType=styleParams.iconType
if(iconType==='bi'){options=Object.keys(bootstrapIcons)}
if(iconType==='property'){options=layer._properties.info.attributes}
const optionsSet=options.length?new Set(options):[]
const sortedOptions=[...optionsSet].sort()
tagify.settings.whitelist=sortedOptions},},callbacks:{...(()=>Object.fromEntries(['blur','add','remove','edit'].map(i=>[i,(e)=>{const tagify=e.detail.tagify
let values=tagify.value.map(i=>i.value)
console.log(tagify,values)
if(values.every(i=>styleParams.iconSpecs.includes(i))&&styleParams.iconSpecs.every(i=>values.includes(i)))return
styleParams.iconSpecs=values
update()}])))()}})
const iconDelimiter=createFormFloating({parent:iconFields,containerClass:`w-10 flex-grow-1 ${styleParams.iconType === 'property' ? '' : 'd-none'}`,fieldAttrs:{type:'text',value:styleParams.iconDelimiter??' ',name:`${id}-iconDelimiter`,},fieldClass:'form-control-sm h-100',labelText:'Delimiter',labelClass:'text-wrap',events:{change:(e)=>{const value=e.target.value
if(value===styleParams.iconDelimiter)return
styleParams.iconDelimiter=value
update()}}})
const patternCheckboxes=customCreateElement({className:'d-flex flex-column justify-content-center border px-3 rounded pt-1',parent:iconFields})
const iconFill=createFormCheck({parent:patternCheckboxes,labelInnerText:'Icon fill',checked:styleParams.iconFill,labelClass:'text-nowrap',events:{click:(e)=>{const value=e.target.checked
if(value===styleParams.iconFill)return
styleParams.iconFill=value
update()}}})
const iconStroke=createFormCheck({parent:patternCheckboxes,labelInnerText:'Icon stroke',checked:styleParams.iconStroke,labelClass:'text-nowrap',events:{click:(e)=>{const value=e.target.checked
if(value===styleParams.iconStroke)return
styleParams.iconStroke=value
update()}}})
const iconFields2=customCreateElement({className:'d-flex gap-2',parent:fieldsContainer,})
const iconSize=createInputGroup({parent:iconFields2,inputGroupClass:'w-25 flex-grow-1',fieldAttrs:{name:`${id}-iconSize`,type:'number',min:'1',max:'100',step:'1',value:styleParams.iconSize,placeholder:'Icon size',},suffixHTML:'px',fieldClass:'form-control-sm',events:{blur:(e)=>{const value=parseFloat(e.target.value)
if(!value||value===styleParams.iconSize){e.target.value=styleParams.iconSize
return}
styleParams.iconSize=value
update()}}})
const iconRotation=createInputGroup({parent:iconFields2,inputGroupClass:'w-25 flex-grow-1',fieldAttrs:{name:`${id}-iconRotation`,type:'number',min:'0',max:'359',step:'15',value:styleParams.iconRotation,placeholder:'Icon rotation',},suffixHTML:'°',fieldClass:'form-control-sm',events:{blur:(e)=>{const value=parseFloat(e.target.value)||0
if(value===styleParams.iconRotation)return
styleParams.iconRotation=value
update()}}})
const iconOffset=createInputGroup({parent:iconFields2,inputGroupClass:'w-25 flex-grow-1',fieldAttrs:{name:`${id}-iconOffset`,type:'text',value:styleParams.iconOffset??'0,0',placeholder:'Icon offset (x,y)',},suffixHTML:'px',fieldClass:'form-control-sm',events:{blur:(e)=>{let value=e.target.value
if(value===styleParams.iconOffset)return
const values=value.split(',')
if(values.length!==2||values.some(i=>isNaN(i))){value=e.target.value='0,0'}
styleParams.iconOffset=value
update()}}})
const iconFields3=customCreateElement({className:'d-flex gap-2',parent:fieldsContainer,})
const iconCheckboxes=customCreateElement({className:'d-flex flex-column justify-content-center border px-3 rounded pt-1 flex-grow-1',style:{maxHeight:'58px'},parent:iconFields3})
const iconShadow=createFormCheck({parent:iconCheckboxes,labelInnerText:'Shadow effect',checked:styleParams.iconShadow,labelClass:'text-nowrap',events:{click:(e)=>{const value=e.target.checked
if(value===styleParams.iconShadow)return
styleParams.iconShadow=value
update()}}})
const iconGlow=createFormCheck({parent:iconCheckboxes,labelInnerText:'Glow effect',checked:styleParams.iconGlow,labelClass:'text-nowrap',events:{click:(e)=>{const value=e.target.checked
if(value===styleParams.iconGlow)return
styleParams.iconGlow=value
update()}}})
const textCheckboxes=customCreateElement({className:'d-flex flex-column flex-wrap justify-content-center border px-2 rounded pt-1 flex-grow-1',style:{maxHeight:'58px'},parent:iconFields3})
const textWrap=createFormCheck({parent:textCheckboxes,formCheckClass:'me-3',labelInnerText:'Text wrap',checked:styleParams.textWrap,labelClass:'text-nowrap',events:{click:(e)=>{const value=e.target.checked
if(value===styleParams.textWrap)return
styleParams.textWrap=value
update()}}})
const fontSerif=createFormCheck({parent:textCheckboxes,labelInnerText:'Font serif',checked:styleParams.fontSerif,labelClass:'text-nowrap',events:{click:(e)=>{const value=e.target.checked
if(value===styleParams.fontSerif)return
styleParams.fontSerif=value
update()}}})
const boldFont=createFormCheck({parent:textCheckboxes,formCheckClass:'me-3',labelInnerText:'Bold font',checked:styleParams.boldFont,labelClass:'text-nowrap',events:{click:(e)=>{const value=e.target.checked
if(value===styleParams.boldFont)return
styleParams.boldFont=value
update()}}})
const italicFont=createFormCheck({parent:textCheckboxes,labelInnerText:'Italic font',checked:styleParams.italicFont,labelClass:'text-nowrap',events:{click:(e)=>{const value=e.target.checked
if(value===styleParams.italicFont)return
styleParams.italicFont=value
update()}}})
const textAlignment=createBadgeSelect({parent:textCheckboxes,selectClass:`border-0 text-start mb-1 w-25`,rounded:false,options:{'center':'Text center','start':'Text left','end':'Text right',},currentValue:styleParams.textAlignment??'center',events:{change:(e)=>{const value=e.target.value
if(value===styleParams.textAlignment)return
styleParams.textAlignment=value
update()}}})
const justifytAlignment=createBadgeSelect({parent:textCheckboxes,selectClass:`border-0 text-start mb-1 w-25`,rounded:false,options:{'center':'Justify center','start':'Justify left','end':'Justify right',},currentValue:styleParams.justifytAlignment??'center',events:{change:(e)=>{const value=e.target.value
if(value===styleParams.justifytAlignment)return
styleParams.justifytAlignment=value
update()}}})
const fillFields=customCreateElement({className:'d-flex gap-2 flex-wrap',parent:fieldsContainer,})
const fillPattern=createFormFloating({parent:fillFields,containerClass:'w-10 flex-grow-1',fieldTag:'select',fieldAttrs:{name:`${id}-fillPattern`},fieldClass:'form-select-sm',labelText:'Fill pattern',options:{'solid':'solid','icon':'icon','none':'none',},currentValue:styleParams.fillPattern,events:{change:(e)=>{const value=e.target.value
if(value===styleParams.fillPattern)return
styleParams.fillPattern=value
update()}}})
const fillColor=createFormFloating({parent:fillFields,containerClass:'w-10 flex-grow-1',fieldAttrs:{name:`${id}-fillColor`,type:'color',value:hslToHex(manageHSLAColor(styleParams.fillColor)),},fieldClass:'form-control-sm',labelText:'Fill color',events:{blur:(e)=>{const value=hexToHSLA(e.target.value)
if(value===styleParams.fillColor)return
styleParams.fillColor=value
update()}}})
const fillOpacity=createInputGroup({parent:fillFields,fieldAttrs:{name:`${id}-fillOpacity`,type:'number',min:'0',max:'100',step:'10',value:styleParams.fillOpacity*100,placeholder:'Fill opacity',},suffixHTML:'%',fieldClass:'form-control-sm',inputGroupClass:'w-25 flex-grow-1',events:{blur:(e)=>{const value=(parseFloat(e.target.value)/100)||0
if(value===styleParams.fillOpacity)return
styleParams.fillOpacity=value
update()}}})
const patternBgFields=customCreateElement({className:'border rounded p-2 d-flex justify-content-center align-items-center gap-1 w-25 flex-grow-1',style:{maxHeight:'58px'},parent:fillFields})
const patternBg=createFormCheck({parent:patternBgFields,labelInnerText:'Pattern background',checked:styleParams.patternBg,labelClass:'text-wrap text-start',formCheckClass:'fs-10',events:{click:(e)=>{const value=e.target.checked
if(value===styleParams.patternBg)return
patternBgColor.disabled=!value
styleParams.patternBg=value
update()}}})
const patternBgColor=(()=>{const input=document.createElement('input')
input.className='p-0'
input.disabled=!styleParams.patternBg
input.setAttribute('name',`${id}-patternBgColor`)
input.setAttribute('type',`color`)
input.value=hslToHex(manageHSLAColor(styleParams.patternBgColor))
input.addEventListener('blur',(e)=>{const value=hexToHSLA(e.target.value)
if(value===styleParams.patternBgColor)return
styleParams.patternBgColor=value
update()})
patternBgFields.appendChild(input)
return input})()
const strokeFields=customCreateElement({className:'d-flex gap-2',parent:fieldsContainer,})
const strokeColor=createFormFloating({parent:strokeFields,containerClass:'w-100 flex-grow-1',fieldAttrs:{name:`${id}-strokeColor`,type:'color',value:hslToHex(manageHSLAColor(styleParams.strokeColor)),},fieldClass:'form-control-sm',labelText:'Stroke color',events:{blur:(e)=>{const value=hexToHSLA(e.target.value)
if(value===styleParams.strokeColor)return
styleParams.strokeColor=value
update()}}})
const strokeOpacity=createInputGroup({parent:strokeFields,fieldAttrs:{name:`${id}-strokeOpacity`,type:'number',min:'0',max:'100',step:'10',value:styleParams.strokeOpacity*100,placeholder:'Stroke opacity',},suffixHTML:'%',fieldClass:'form-control-sm',events:{blur:(e)=>{const value=(parseFloat(e.target.value)/100)||0
if(value===styleParams.strokeOpacity)return
styleParams.strokeOpacity=value
update()}}})
const strokeWidth=createInputGroup({parent:strokeFields,fieldAttrs:{name:`${id}-strokeWidth`,type:'number',min:'0',max:'10',step:'1',value:styleParams.strokeWidth,placeholder:'Stroke width',},suffixHTML:'px',fieldClass:'form-control-sm',events:{blur:(e)=>{const value=parseFloat(e.target.value)||0
if(value===styleParams.strokeWidth)return
styleParams.strokeWidth=value
update()}}})
const lineFields=customCreateElement({className:'d-flex gap-2',parent:fieldsContainer,})
const lineCap=createFormFloating({parent:lineFields,containerClass:'w-100 flex-grow-1',fieldTag:'select',fieldAttrs:{name:`${id}-lineCap`},fieldClass:'form-select-sm',labelText:'Line cap',options:{'round':'round','butt':'butt','square':'square',},currentValue:styleParams.lineCap,events:{change:(e)=>{const value=e.target.value
if(value===styleParams.lineCap)return
styleParams.lineCap=value
update()}}})
const lineJoin=createFormFloating({parent:lineFields,containerClass:'w-100 flex-grow-1',fieldTag:'select',fieldAttrs:{name:`${id}-lineJoin`},fieldClass:'form-select-sm',labelText:'Line join',options:{'round':'round','arcs':'arcs','bevel':'bevel','miter':'miter','miter-clip':'miter-clip',},currentValue:styleParams.lineJoin,events:{change:(e)=>{const value=e.target.value
if(value===styleParams.lineJoin)return
styleParams.lineJoin=value
update()}}})
const lineBreak=createFormFloating({parent:lineFields,containerClass:'w-100 flex-grow-1',fieldTag:'select',fieldAttrs:{name:`${id}-lineBreak`},fieldClass:'form-select-sm',labelText:'Line break',options:{'solid':'solid','dashed':'dashed','dotted':'dotted',},currentValue:styleParams.lineBreak,events:{change:(e)=>{const value=e.target.value
if(value===styleParams.lineBreak)return
const strokeWidth=styleParams.strokeWidth
styleParams.dashArray=value==='solid'?null:`${
                        value === 'dashed' 
                        ? (strokeWidth * 5) 
                        : (((Math.ceil(strokeWidth)) - 1) || 1)
                    } ${strokeWidth * 3}`
styleParams.lineBreak=value
update()}}})
return parent}
const updateSymbologyGroups=async()=>{controller=resetController({controller,message:'New symbology method update.'})
const controllerId=controller.id
const spinner=body.querySelector(`#${body.id}-symbologySpinner`)
spinner.classList.remove('d-none')
const symbology=layer._properties.symbology
if(symbology.groups){Object.values(symbology.groups).forEach(i=>{document.querySelector(`svg#svgFillDefs defs#${i.styleParams.fillPatternId}`)?.remove()})
delete symbology.groups}
const container=body.querySelector(`#${body.id}-methodDetails`)
container.innerHTML=''
if(symbology.method!=='single'&&symbology.groupBy?.length){const geojson=(await getLeafletGeoJSONData(layer,{controller,filter:true,}))??layer.toGeoJSON()
if(controllerId!==controller.id)return
if(geojson&&(symbology.method==='categorized')){let groups=[]
geojson?.features?.forEach(feature=>{const values=Object.fromEntries(symbology.groupBy.map(i=>[i,((e)=>{if(i==='[geometry_type]')return feature.geometry.type
let value=removeWhitespace(String(feature.properties[i]??'[undefined]'))
if(symbology.case===false)value=value.toLowerCase()
return value===''?'[blank]':value})()]))
groups.push(JSON.stringify(values))})
if(controllerId!==controller.id)return
const groupsSetSorted=(groups.length?[...new Set(groups)]:[]).sort((a,b)=>{const countOccurrences=(item,search)=>item.split(search).length-1
const aCount=countOccurrences(a,'[undefined]')+countOccurrences(a,'[blank]')
const bCount=countOccurrences(b,'[undefined]')+countOccurrences(b,'[blank]')
return aCount!==bCount?aCount-bCount:(a.localeCompare(b))})
const count=groupsSetSorted.length
if(count){symbology.default.rank=count+1
symbology.groups={}
let rank=0
for(const group of groupsSetSorted){if(controllerId!==controller.id)return
rank+=1
const filters=JSON.parse(group)
const styleParams=await updateSymbology(getLeafletStyleParams({...symbology.default.styleParams,fillColor:removeWhitespace(`hsla(
                                ${Math.round(Math.random()*(
                                    ((360/count*rank)-(360/count*0.75))-(360/count*(rank-1))
                                ))+(360/count*(rank-1))},
                                ${Math.round(Math.random()*(100-75))+75}%,
                                ${Math.round(Math.random()*(55-45))+45}%,
                            1)`),fillOpacity:0.5,strokeColor:true,strokeOpacity:1,patternBgColor:null,fillPatternId:null,}),{refresh:false,updateLocalStorage:false})
if(controllerId!==controller.id)return
if(!symbology.groups)return
symbology.groups[generateRandomString()]={active:true,label:Object.values(filters).join(', '),showCount:true,showLabel:true,rank,styleParams,filters:{type:(()=>{const value={active:false,values:{Point:true,MultiPoint:true,LineString:true,MultiLineString:true,Polygon:true,MultiPolygon:true,}}
if(Object.keys(filters).includes('[geometry_type]')){value.active=true
Object.keys(value.values).forEach(i=>{value.values[i]=i===filters['[geometry_type]']})}
return value})(),properties:(()=>{const value={active:false,values:{},operator:'&&'}
const propertyFilters=Object.keys(filters).filter(i=>i!=='[geometry_type]')
if(propertyFilters.length){value.active=true
propertyFilters.forEach(i=>{value.values[generateRandomString()]={active:true,property:i,handler:'equals',value:true,case:symbology.case,values:[filters[i]]}})}
return value})(),geom:{active:false,values:{},operator:'&&'},},}}}}
if(geojson&&(symbology.method==='graduated')){const property=symbology.groupBy[0]
const validFeatures=geojson.features.filter(i=>!isNaN(parseFloat(i.properties[property]??'')))
if(validFeatures.length){if(controllerId!==controller.id)return
const values=validFeatures.map(i=>parseFloat(i.properties[property]??''))
const min=Math.min(...values)
const max=Math.max(...values)
const diff=max-min
const groupCount=symbology.groupCount=form.elements.groupCount.value=diff===0?1:symbology.groupCount||5
const interval=diff===0?0:diff/(groupCount-1)
const precision=symbology.groupPrecision=form.elements.groupPrecision.value=diff===0?1:symbology.groupPrecision||Number(`1${'0'.repeat(Math.floor((String(interval).length)/2))}`)
const groups=[]
let currentMin=min
while(currentMin<max||!groups.length){if(controllerId!==controller.id)break
const currentMax=Math.round((currentMin+interval)/precision)*precision
groups.push({min:currentMin,max:currentMax>max?max:currentMax})
currentMin=currentMax}
if(controllerId!==controller.id)return
const count=groups.length
if(count){symbology.default.rank=groups.length+1
if(groups.length){const hslaColor=manageHSLAColor(generateRandomColor())
symbology.groups={}
let rank=0
for(const filters of groups){if(controllerId!==controller.id)return
rank+=1
const styleParams=await updateSymbology(getLeafletStyleParams({...symbology.default.styleParams,fillColor:hslaColor.toString({l:20+(((80-20)/(groups.length-1||1))*(rank-1))}),fillOpacity:0.5,strokeColor:true,strokeOpacity:1,patternBgColor:null,fillPatternId:null,iconStroke:false,iconSize:10+(((50-10)/(groups.length-1||1))*(rank-1)),strokeWidth:1+(((5-1)/(groups.length-1||1))*(rank-1))}),{refresh:false,updateLocalStorage:false})
if(controllerId!==controller.id)return
if(!symbology.groups)return
symbology.groups[generateRandomString()]={active:true,label:`${formatNumberWithCommas(filters.min)} - ${formatNumberWithCommas(filters.max)}`,showCount:true,showLabel:true,rank,styleParams,filters:{type:{active:false,values:{Point:true,MultiPoint:true,LineString:true,MultiLineString:true,Polygon:true,MultiPolygon:true,}},properties:(()=>{const value={active:true,values:{},operator:'&&'}
value.values[generateRandomString()]={active:true,property,handler:'greaterThanEqualTo',value:true,case:true,values:[filters.min]}
value.values[generateRandomString()]={active:true,property,handler:'lessThanEqualTo',value:true,case:true,values:[filters.max]}
return value})(),geom:{active:false,values:{},operator:'&&'},},}}}}}}}
Array(...Object.keys(symbology.groups??{}),'').forEach(i=>{if(controllerId!==controller.id)return
container.appendChild(getSymbologyForm(i))})
spinner.classList.add('d-none')
if(controllerId!==controller.id)return
updateLeafletGeoJSONLayer(layer,{geojson:layer.toGeoJSON(),controller,})}
const getGeomFilterForm=(id)=>{const filters=layer._properties.filters
const filter=filters.geom.values[id]
const parent=customCreateElement({className:'d-flex gap-2 flex-column'})
const paramsFields=customCreateElement({className:'d-flex gap-2 flex-grow-1 align-items-center',parent,})
const enable=createFormCheck({parent:paramsFields,checked:filter.active,name:`geomFilter-enable-${id}`,disabled:!filters.geom.active,events:{click:(e)=>{const value=e.target.checked
if(value===filter.active)return
filter.active=value
if(filter.geoms?.length)updateLeafletGeoJSONLayer(layer,{controller,})}}})
const handler=createFormFloating({parent:paramsFields,containerClass:'w-100 flex-grow-1',fieldTag:'select',fieldAttrs:{name:`geomFilter-handler-${id}`,},fieldClass:'form-select-sm',labelText:'Relation',labelClass:'text-nowrap',disabled:!filters.geom.active,options:{'booleanIntersects':'intersects','booleanEqual':'equals','booleanTouches':'touches','booleanWithin':'within','booleanContains':'contains',},currentValue:filter.handler,events:{change:(e)=>{const value=e.target.value
if(value===filter.handler)return
filter.handler=value
if(filter.active&&filter.geoms?.length)updateLeafletGeoJSONLayer(layer,{controller,})}}})
const checkboxes=customCreateElement({className:'d-flex flex-column justify-content-center border px-3 rounded pt-1',style:{height:'58px'},parent:paramsFields})
const value=createFormCheck({parent:checkboxes,labelInnerText:'Relation is true',checked:filter.value,labelClass:'text-nowrap',disabled:!filters.geom.active,name:`geomFilter-value-${id}`,events:{click:(e)=>{const value=e.target.checked
if(value===filter.value)return
filter.value=value
if(filter.active&&filter.geoms?.length)updateLeafletGeoJSONLayer(layer,{controller,})}}})
const geomsFields=customCreateElement({className:'d-flex gap-2 flex-grow-1 align-items-center',parent,})
const btnsContainer=customCreateElement({parent:geomsFields,className:'d-flex flex-column justify-content-center pt-1 me-1',})
const zoominBtn=createButton({parent:btnsContainer,className:'fs-12 bg-transparent border-0 p-0',iconSpecs:'bi bi bi-zoom-in',disabled:!filters.geom.active,name:`geomFilter-zoomin-${id}`,events:{click:(e)=>{if(!filter.geoms?.length)return
zoomToLeafletLayer(L.geoJSON(turf.featureCollection(filter.geoms.map(i=>turf.feature(i)))),map)}}})
const legendBtn=createButton({parent:btnsContainer,className:'fs-12 bg-transparent border-0 p-0',iconSpecs:'bi bi-plus-lg',disabled:!filters.geom.active,name:`geomFilter-legend-${id}`,events:{click:async(e)=>{if(!filter.geoms?.length)return
const geojson=turf.featureCollection(filter.geoms.map(i=>turf.feature(i)))
const addLayers=await getLeafletGeoJSONLayer({geojson,params:{name:'geometry filter'},pane:createCustomPane(map),group:map._handlers.getLayerGroups().local,customStyleParams:{fillOpacity:0,strokeWidth:3,strokeColor:generateRandomColor()},})
if(addLayers)addLayers._group.addLayer(addLayers)}}})
const removeBtn=createButton({parent:btnsContainer,className:'fs-12 bg-transparent border-0 p-0',iconSpecs:'bi bi-trash-fill',disabled:!filters.geom.active,name:`geomFilter-remove-${id}`,events:{click:(e)=>{parent.remove()
const update=filter.active&&filter.geoms?.length
delete filters.geom.values[id]
if(update)updateLeafletGeoJSONLayer(layer,{controller,})}}})
const geom=createFormFloating({parent:geomsFields,containerClass:'flex-grow-1',fieldAttrs:{name:`geomFilter-geom-${id}`},fieldTag:'textarea',fieldClass:'fs-12',fieldStyle:{minHeight:'100px'},currentValue:(filter.geoms??[]).map(i=>JSON.stringify(i)).join(','),labelText:'Comma-delimited geometries',disabled:!filters.geom.active,events:{blur:(e)=>{e.target.classList.remove('is-invalid')
let value
try{value=e.target.value.trim()
if(!value.startsWith('['))value=`[${value}`
if(!value.endsWith(']'))value=`${value}]`
value=JSON.parse(value)
if(!value.every(i=>turf.booleanValid(i)))throw new Error('Invalid goemetry')
value=value.map(i=>{return simplifyFeature(i,{maxPts:100,highQuality:true,}).geometry}).filter(i=>i)
e.target.value=value.map(i=>JSON.stringify(i)).join(',')}catch(error){console.log(error)
e.target.classList.add('is-invalid')
value=null}
if(!value&&!filter.geoms?.length)return
if(value&&filter.geoms&&filter.geoms.length&&value.every(i=>filter.geoms.find(g=>turf.booleanEqual(i,g)))&&filter.geoms.every(i=>value.find(g=>turf.booleanEqual(i,g))))return
filter.geoms=value
if(filter.active)updateLeafletGeoJSONLayer(layer,{controller,})}}})
return parent}
const getPropertyFilterForm=(id)=>{const filters=layer._properties.filters
const filter=filters.properties.values[id]
const parent=customCreateElement({className:'d-flex gap-2 flex-column'})
const paramsFields=customCreateElement({className:'d-flex gap-2 flex-grow-1 align-items-center',parent,})
const enable=createFormCheck({parent:paramsFields,checked:filter.active,name:`propFilter-enable-${id}`,disabled:!filters.properties.active,events:{click:(e)=>{const value=e.target.checked
if(value===filter.active)return
filter.active=value
if(filter.property&&filter.values?.length)updateLeafletGeoJSONLayer(layer,{controller,})}}})
const property=createFormFloating({parent:paramsFields,containerClass:'w-100 flex-grow-1',fieldTag:'select',fieldAttrs:{name:`propFilter-property-${id}`},fieldClass:'form-select-sm',labelText:'Property',disabled:!filters.properties.active,options:{[filter.property||'']:filter.property||''},currentValue:filter.property||'',events:{focus:async(e)=>{const field=e.target
field.innerHTML=''
const options=layer._properties.info.attributes
const optionsSet=options.length?new Set(options):[]
const sortedOptions=[...optionsSet].sort()
for(const i of sortedOptions){const option=document.createElement('option')
option.value=i
option.text=i
if(i===field.property)option.setAttribute('selected',true)
field.appendChild(option)}},blur:(e)=>{const value=e.target.value
if(value===filter.property)return
filter.property=value
if(filter.active&&filter.values?.length)updateLeafletGeoJSONLayer(layer,{controller,})}}})
const handler=createFormFloating({parent:paramsFields,containerClass:'w-100 flex-grow-1',fieldTag:'select',fieldAttrs:{name:`propFilter-handler-${id}`},fieldClass:'form-select-sm',labelText:'Relation',disabled:!filters.properties.active,options:{'equals':'equals','contains':'contains','greaterThan':'greater than','greaterThanEqualTo':'greater than or equal to','lessThan':'less than','lessThanEqualTo':'less than or equal to',},currentValue:filter.handler,events:{change:(e)=>{const value=e.target.value
if(value===filter.handler)return
filter.handler=value
if(filter.active&&filter.property&&filter.values?.length)updateLeafletGeoJSONLayer(layer,{controller,})}}})
const checkboxes=customCreateElement({className:'d-flex flex-column justify-content-center border px-3 rounded pt-1',style:{height:'58px'},parent:paramsFields})
const value=createFormCheck({parent:checkboxes,labelInnerText:'Relation is true',checked:filter.value,labelClass:'text-nowrap',disabled:!filters.properties.active,name:`propFilter-value-${id}`,events:{click:(e)=>{const value=e.target.checked
if(value===filter.value)return
filter.value=value
if(filter.active&&filter.property&&filter.values?.length)updateLeafletGeoJSONLayer(layer,{controller,})}}})
const caseSensitive=createFormCheck({parent:checkboxes,labelInnerText:'Case-sensitive',checked:filter.case,labelClass:'text-nowrap',disabled:!filters.properties.active,name:`propFilter-case-${id}`,events:{click:(e)=>{const value=e.target.checked
if(value===filter.case)return
filter.case=value
if(filter.active&&filter.property&&filter.values?.length)updateLeafletGeoJSONLayer(layer,{controller,})}}})
const valueFields=customCreateElement({className:'d-flex gap-2 flex-grow-1 align-items-center',parent,})
const removeBtn=createButton({parent:valueFields,className:'fs-12 bg-transparent border-0 p-0 me-1',iconSpecs:'bi bi-trash-fill',disabled:!filters.properties.active,name:`propFilter-remove-${id}`,events:{click:(e)=>{parent.remove()
delete filters.properties.values[id]
if(filter.active&&filter.property&&filter.values?.length)updateLeafletGeoJSONLayer(layer,{controller,})}}})
const values=createTagifyField({parent:valueFields,inputClass:`w-100 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1`,inputTag:'textarea',delimiters:null,enabled:0,disabled:!filters.properties.active,dropdownClass:`my-1 border-0`,userInput:true,scopeStyle:{minHeight:'58px',},name:`propFilter-values-${id}`,placeholder:'Select property values',currentValue:JSON.stringify((filter.values||[]).map(i=>{return{value:i}})),events:{focus:async(e)=>{const tagify=Tagify(form.elements[`propFilter-values-${id}`])
const options=[]
if(Array('equals').includes(filter.handler)&&filter.property){const geojson=(await getLeafletGeoJSONData(layer,{controller,filter:false,}))??layer.toGeoJSON()
turf.propEach(geojson,(currentProperties,featureIndex)=>{let value=removeWhitespace(String(currentProperties[filter.property]??'[undefined]'))
value=value===''?'[blank]':value
if(!filter.values.includes(value))options.push(String(value))})}
const optionsSet=options.length?new Set(options):[]
const sortedOptions=[...optionsSet].sort()
tagify.settings.whitelist=sortedOptions},},callbacks:{...(()=>Object.fromEntries(['blur'].map(i=>[i,(e)=>{const tagify=e.detail.tagify
const values=tagify.value.map(i=>i.value)
if(values.every(i=>filter.values.includes(i))&&filter.values.every(i=>values.includes(i)))return
filter.values=values
if(filter.active&&filter.property)updateLeafletGeoJSONLayer(layer,{controller,})}])))()}})
return parent}
select.addEventListener('focus',(e)=>{leafletMapLegendLayersToSelectOptions(map,select,{layer})})
select.addEventListener('change',()=>{const addLayersId=parseInt(select.value)
body.innerHTML=''
layer=map._handlers.getLegendLayer(addLayersId)
if(!layer){body.removeAttribute('data-layer-id')
body.classList.add('d-none')
return}
body.setAttribute('data-layer-id',addLayersId)
body.classList.remove('d-none')
const layerLegend=getLayerLegend()
const layerStyles=layer._properties
const symbology=layerStyles.symbology
const visibility=layerStyles.visibility
const filters=layerStyles.filters
const transformations=layerStyles.transformations
const info=layerStyles.info
const limits=layerStyles.limits
const filterContainerId=generateRandomString()
const layerType=layer._params.type
const styleFields={'Legend':{...(layer._indexedDBKey.startsWith('local')?{}:{'Access details':{fields:{format:{handler:createInputGroup,inputGroupClass:'w-100 flex-grow-1 fs-12',fieldAttrs:{name:`access-format`,type:'text',value:getLayerFormat(layer._params),placeholder:getLayerFormat(layer._params),readonly:true},prefixHTML:'<span style="width:65px;">Format</span>',fieldClass:'form-control-sm',},url:{handler:createInputGroup,inputGroupClass:'w-100 flex-grow-1 fs-12',fieldAttrs:{name:`access-url`,type:'url',value:layer._params.url,placeholder:layer._params.url,readonly:true},prefixHTML:'<span style="width:65px;">URL</span>',suffixHTML:createButton({className:'btn-sm bi bi-clipboard p-0 fs-10 active-border-none',title:'Copy to clipboard',events:{click:(e)=>{navigator.clipboard.writeText(layer._params.url)}}}),fieldClass:'form-control-sm',},...(layer._params.type==='xyz'?{}:{name:{handler:createInputGroup,inputGroupClass:'w-100 flex-grow-1 fs-12',fieldAttrs:{name:`access-name`,type:'text',value:layer._params.name,placeholder:layer._params.name,readonly:true,},prefixHTML:`<span style="width:65px;">${(
                                    Array('wms', 'wfs').includes(layerType) ? 'Layer' :
                                    Array('overpass').includes(layerType) ? 'Tag' :
                                    'Name'
                                )}</span>`,suffixHTML:createButton({className:'btn-sm bi bi-clipboard p-0 fs-10 active-border-none',title:'Copy to clipboard',events:{click:(e)=>{navigator.clipboard.writeText(layer._params.name)}}}),fieldClass:'form-control-sm',}}),},className:'gap-2 flex-wrap'}}),'Identification':{fields:{title:{handler:createFormFloating,containerClass:'w-25 flex-grow-1',fieldAttrs:{type:'text',value:layer._params.title,},fieldClass:'form-control-sm',labelText:'Title',events:{change:(e)=>{const field=e.target
layer._params.title=field.value
const element=layerLegend.querySelector(`#${layerLegend.id}-title`)?.querySelector('span')
if(element)element.innerText=field.value
select.options[select.selectedIndex].text=field.value
map._handlers.updateStoredLegendLayers({layer})}}},idChecks:{handler:({parent}={})=>{const container=customCreateElement({parent,className:'d-flex flex-column justify-content-center w-10 flex-grow-1 border rounded px-3 pt-1',style:{height:'58px'}})
const layerLegend=getLayerLegend()
const attribution=layerLegend.querySelector(`#${layerLegend.id}-attribution`)
container.appendChild(createFormCheck({checked:layer?._properties?.info?.showLegend!==false,labelInnerText:'Show legend',labelClass:'text-nowrap',role:'checkbox',name:'showLegend',events:{click:(e)=>{const layers=layerLegend.parentElement
layerLegend.classList.toggle('d-none')
layers.classList.toggle('d-none',Array.from(layers?.querySelectorAll('[data-layer-legend="true"]')).every(el=>el.classList.contains('d-none')))
layer._properties.info.showLegend=e.target.checked
map._handlers.updateStoredLegendLayers({layer})}}}))
container.appendChild(createFormCheck({checked:layer?._properties?.info?.showAttribution!==false,labelInnerText:'Show attribution',labelClass:'text-nowrap',role:'checkbox',name:'showAttr',events:{click:(e)=>{attribution.classList.toggle('d-none')
layer._properties.info.showAttribution=e.target.checked
map._handlers.updateStoredLegendLayers({layer})}}}))}},attribution:{handler:createFormFloating,containerClass:'w-100 flex-grow-1',fieldTag:'textarea',currentValue:layer._params.attribution,labelText:'Attribution (HTML-frieldly)',fieldClass:'fs-12',fieldStyle:{minHeight:'100px',},events:{change:(e)=>{const field=e.target
const div=document.createElement('div')
div.innerHTML=field.value
Array.from(div.querySelectorAll('a')).forEach(a=>{a.setAttribute('target','_blank')
const href=a.getAttribute('href')
if(!href.startsWith('http'))a.setAttribute('href',`https://${href}`)})
const value=div.innerHTML
layer._params.attribution=value
const element=layerLegend.querySelector(`#${layerLegend.id}-attribution`)
element.innerHTML=value
map._handlers.updateStoredLegendLayers({layer})}}},},className:'gap-2 flex-wrap'},...(layer instanceof L.GeoJSON?{'Symbology':{fields:{method:{handler:createFormFloating,containerClass:'w-25',fieldAttrs:{name:'method',},fieldTag:'select',labelText:'Method',options:{'single':'Single','categorized':'Categorized','graduated':'Graduated',},currentValue:symbology.method,fieldClass:'form-select-sm',events:{change:(e)=>{const field=e.target
const value=field.value
symbology.method=value
const tagifyObj=Tagify(form.elements.groupBy)
const tagifyElement=tagifyObj.DOM.scope
if(value==='single'){tagifyElement.setAttribute('disabled',true)}else{const maxTags=value==='categorized'?5:1
tagifyObj.settings.maxTags=maxTags
if(tagifyObj.value.length>maxTags)tagifyObj.removeAllTags()
tagifyElement.removeAttribute('disabled')}
body.querySelector(`#${body.id}-graduatedParams`).classList.toggle('d-none',value!=='graduated')
body.querySelector(`#${body.id}-categoryParams`).classList.toggle('d-none',value!=='categorized')
if(value==='single'||symbology.groupBy?.length)updateSymbologyGroups()}}},groupBy:{handler:createTagifyField,inputClass:`w-25 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1 overflow-auto`,inputTag:'textarea',enabled:0,disabled:symbology.method==='single',dropdownClass:`my-1 border-0`,userInput:true,maxTags:symbology.method==='categorized'?5:1,scopeStyle:{height:'58px',},name:`groupBy`,placeholder:'Select properties',currentValue:JSON.stringify((symbology.groupBy||[]).map(i=>{return{value:i}})),events:{focus:async(e)=>{const tagify=Tagify(form.elements['groupBy'])
const options=layer._properties.info.attributes
if(symbology.method==='categorized'){options.push('[geometry_type]')}
const optionsSet=options.length?new Set(options):[]
const sortedOptions=[...optionsSet].filter(i=>{return!(symbology.groupBy??[]).includes(i)}).sort()
tagify.settings.whitelist=sortedOptions},},callbacks:{...(()=>Object.fromEntries(['blur'].map(i=>[i,(e)=>{const tagify=e.detail.tagify
const values=tagify.value.map(i=>i.value)
if(values.every(i=>symbology.groupBy.includes(i))&&symbology.groupBy.every(i=>values.includes(i)))return
symbology.groupBy=values
updateSymbologyGroups()}])))()}},categoryParams:{handler:({parent}={})=>{const div=customCreateElement({parent,id:`${body.id}-categoryParams`,style:{width:'20%',height:'58px'},className:`d-flex flex-column justify-content-center gap-1 w-25 border rounded px-3 py-1 ${symbology.method !== 'categorized' ? 'd-none' : ''}`})
div.appendChild(createFormCheck({checked:symbology.case,formCheckClass:'w-100',labelInnerText:'Case-sensitive',events:{click:(e)=>{const value=e.target.checked
if(value===symbology.case)return
symbology.case=value
updateSymbologyGroups()}}}))}},graduatedParams:{handler:({parent}={})=>{const div=customCreateElement({parent,id:`${body.id}-graduatedParams`,style:{width:'20%',height:'58px'},className:`d-flex flex-column justify-content-between gap-1 w-25 ${symbology.method !== 'graduated' ? 'd-none' : ''}`})
div.appendChild(createFormFloating({fieldAttrs:{name:'groupCount',type:'number',value:symbology.groupCount??'',placeholder:'No. of groups',},fieldClass:`py-1 px-2 fs-10`,events:{'blur':(e)=>{const value=parseInt(e.target.value)
if(value===symbology.groupCount)return
symbology.groupCount=value
updateSymbologyGroups()},}}).firstChild)
div.appendChild(createFormFloating({fieldAttrs:{name:'groupPrecision',type:'number',value:symbology.groupPrecision??'',placeholder:'Precision',},fieldClass:`py-1 px-2 fs-10`,events:{'blur':(e)=>{const value=parseInt(e.target.value)
if(value===symbology.groupPrecision)return
symbology.groupPrecision=value
updateSymbologyGroups()},}}).firstChild)}},spinner:{handler:({parent}={})=>{const div=customCreateElement({id:`${body.id}-symbologySpinner`,className:'spinner-border spinner-border-sm d-none mx-2',attrs:{role:'status'}})
parent.appendChild(div)},},collapse:{handler:createIcon,className:'dropdown-toggle ms-auto',peNone:false,attrs:{'data-bs-toggle':'collapse','aria-expanded':'true','data-bs-target':`#${body.id}-methodDetails-collapse`,'aria-controls':`${body.id}-methodDetails-collapse`,},style:{cursor:'pointer'},events:{click:(e)=>{const collapse=document.querySelector(e.target.getAttribute('data-bs-target'))
if(collapse.classList.contains('show'))return
Array.from(collapse.querySelectorAll('.collapse')).forEach(i=>{bootstrap.Collapse.getOrCreateInstance(i).hide()})}}},methodDetails:{handler:({parent}={})=>{const collapse=customCreateElement({id:`${body.id}-methodDetails-collapse`,className:'collapse show w-100',parent,})
const container=customCreateElement({id:`${body.id}-methodDetails`,className:'w-100 d-flex flex-column accordion gap-3',parent:collapse,})
if(symbology.method==='single'){container.appendChild(getSymbologyForm(''))}else{const groupIds=Object.entries(symbology.groups||{}).sort(([keyA,valueA],[keyB,valueB])=>{return valueA.rank-valueB.rank}).map(i=>i[0])
Array(...groupIds,'').forEach(i=>{container.appendChild(getSymbologyForm(i))})}}}},className:'gap-2 flex-wrap'},}:{})},'Rendering':{'Visibility':{fields:{enableScale:{handler:createFormCheck,checked:visibility.active,formCheckClass:'w-100',labelInnerText:'Enable scale-dependent rendering',role:'switch',events:{click:(e)=>{const value=e.target.checked
if(value===visibility.active)return
form.elements.minScale.disabled=!value
form.elements.maxScale.disabled=!value
visibility.active=value
leafletLayerIsVisible(layer,{updateLocalStorage:true})}}},minScale:{handler:createInputGroup,fieldAttrs:{name:'minScale',type:'number',min:'10',max:visibility.max,step:'10',value:visibility.min,placeholder:'Maximum',},prefixHTML:'1:',suffixHTML:'m',fieldClass:'form-control-sm',disabled:!visibility.active,inputGroupClass:'w-25 flex-grow-1',events:{'change':(e)=>{const field=e.target
const maxScaleField=form.elements.maxScale
if(!field.value){field.value=10}else{const maxScaleValue=parseInt(maxScaleField.value)
if(maxScaleValue<parseInt(field.value))field.value=maxScaleValue}
visibility.min=parseInt(field.value)
maxScaleField.setAttribute('min',field.value)
leafletLayerIsVisible(layer,{updateLocalStorage:true})},'click':visibilityFieldsClick,}},maxScale:{handler:createInputGroup,fieldAttrs:{name:'maxScale',type:'number',min:visibility.min,max:'5000000',step:'10',value:visibility.max,placeholder:'Minimum',},prefixHTML:'1:',suffixHTML:'m',fieldClass:'form-control-sm',disabled:!visibility.active,inputGroupClass:'w-25 flex-grow-1',events:{'change':(e)=>{const field=e.target
const minScaleField=form.elements.minScale
if(!field.value){field.value=5000000}else{const minScaleValue=parseInt(minScaleField.value)
if(minScaleValue>parseInt(field.value))field.value=minScaleValue}
visibility.max=parseInt(field.value)
minScaleField.setAttribute('max',field.value)
leafletLayerIsVisible(layer,{updateLocalStorage:true})},'click':visibilityFieldsClick,}},},className:'flex-wrap gap-2'},...(layer instanceof L.GeoJSON?{'Feature Interactivity':{fields:{enableTooltip:{handler:createFormCheck,checked:info.tooltip.active,formCheckClass:'w-100 flex-grow-1 mt-2',labelInnerText:'Tooltip',role:'switch',events:{click:(e)=>{const value=e.target.checked
if(value===info.tooltip.active)return
info.tooltip.active=value
updateLeafletGeoJSONLayer(layer,{geojson:value?layer.toGeoJSON():null,controller,})}}},tooltipProps:{handler:createTagifyField,inputClass:`w-50 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1 overflow-auto`,inputTag:'textarea',enabled:0,dropdownClass:`my-1 border-0`,userInput:true,maxTags:5,scopeStyle:{height:'58px',},name:`tooltipProps`,placeholder:'Select properties',currentValue:JSON.stringify((info.tooltip.properties||[]).map(i=>{return{value:i}})),events:{focus:async(e)=>{const tagify=Tagify(form.elements['tooltipProps'])
const options=layer._properties.info.attributes
const optionsSet=options.length?new Set(options):[]
const sortedOptions=[...optionsSet].filter(i=>{return!(info.tooltip.properties||[]).includes(i)}).sort()
tagify.settings.whitelist=sortedOptions},},callbacks:{...(()=>Object.fromEntries(['blur'].map(i=>[i,(e)=>{const tagify=e.detail.tagify
const values=tagify.value.map(i=>i.value)
if(values.every(i=>info.tooltip.properties.includes(i))&&info.tooltip.properties.every(i=>values.includes(i)))return
info.tooltip.properties=values
if(info.tooltip.active)updateLeafletGeoJSONLayer(layer,{geojson:layer.toGeoJSON(),controller,})}])))()}},tooltipDel:{handler:createFormFloating,containerClass:'w-10 flex-grow-1',fieldAttrs:{type:'text',value:info.tooltip.delimiter,},fieldClass:'form-control-sm',labelText:'Delimiter',labelClass:'text-wrap',events:{change:(e)=>{const value=e.target.value
if(value===info.tooltip.delimiter)return
info.tooltip.delimiter=value
if(info.tooltip.active)updateLeafletGeoJSONLayer(layer,{geojson:layer.toGeoJSON(),controller,})}}},tooltipPrefix:{handler:createFormFloating,containerClass:'w-10 flex-grow-1',fieldAttrs:{type:'text',value:info.tooltip.prefix,},fieldClass:'form-control-sm',labelText:'Prefix',labelClass:'text-wrap',events:{change:(e)=>{const value=e.target.value
if(value===info.tooltip.prefix)return
info.tooltip.prefix=value
if(info.tooltip.active)updateLeafletGeoJSONLayer(layer,{geojson:layer.toGeoJSON(),controller,})}}},tooltipSuffix:{handler:createFormFloating,containerClass:'w-10 flex-grow-1',fieldAttrs:{type:'text',value:info.tooltip.suffix,},fieldClass:'form-control-sm',labelText:'Suffix',labelClass:'text-wrap',events:{change:(e)=>{const value=e.target.value
if(value===info.tooltip.suffix)return
info.tooltip.suffix=value
if(info.tooltip.active)updateLeafletGeoJSONLayer(layer,{geojson:layer.toGeoJSON(),controller,})}}},enablePopup:{handler:createFormCheck,checked:info.popup.active,formCheckClass:'w-100 flex-shirnk-1 mt-2',labelInnerText:'Popup',role:'switch',events:{click:(e)=>{const value=e.target.checked
if(value===info.popup.active)return
info.popup.active=value
updateLeafletGeoJSONLayer(layer,{geojson:value?layer.toGeoJSON():null,controller,})}}},popupProps:{handler:createTagifyField,inputClass:`w-75 flex-grow-1 border rounded p-1 d-flex flex-wrap gap-1 overflow-auto`,inputTag:'textarea',enabled:0,dropdownClass:`my-1 border-0`,userInput:true,scopeStyle:{height:'58px',},name:`popupProps`,placeholder:'Select properties',currentValue:JSON.stringify((info.popup.properties||[]).map(i=>{return{value:i}})),events:{focus:async(e)=>{const tagify=Tagify(form.elements['popupProps'])
const options=layer._properties.info.attributes
const optionsSet=options.length?new Set(options):[]
const sortedOptions=[...optionsSet].filter(i=>{return!(info.popup.properties||[]).includes(i)}).sort()
tagify.settings.whitelist=sortedOptions},},callbacks:{...(()=>Object.fromEntries(['blur'].map(i=>[i,(e)=>{const tagify=e.detail.tagify
const values=tagify.value.map(i=>i.value)
if(values.every(i=>info.popup.properties.includes(i))&&info.popup.properties.every(i=>values.includes(i)))return
info.popup.properties=values
if(info.popup.active)updateLeafletGeoJSONLayer(layer,{geojson:layer.toGeoJSON(),controller,})}])))()}},},className:'flex-wrap gap-1'},'Feature Count Limit':{fields:{enableFeatureLimit:{handler:createFormCheck,checked:limits.active,formCheckClass:'w-100 flex-grow-1 mt-2',labelInnerText:'Enable feature count limit',role:'switch',events:{click:(e)=>{const value=e.target.checked
if(value===limits.active)return
limits.active=value
updateLeafletGeoJSONLayer(layer,{geojson:value?layer.toGeoJSON():null,controller,})}}},maxFeatureCount:{handler:createFormFloating,containerClass:'w-10 flex-grow-1',fieldAttrs:{type:'number',min:0,max:50000,value:limits.max,},fieldClass:'form-control-sm',labelText:'Maximum feature count',labelClass:'text-wrap',events:{change:(e)=>{const value=e.target.value=Number(e.target.value)
if(value===limits.max)return
limits.max=value
if(limits.active)updateLeafletGeoJSONLayer(layer,{controller,})}}},limitMethod:{handler:createFormFloating,containerClass:'w-50',fieldTag:'select',labelText:'Method',options:{'limit':'Limit to set maximum','scale':'Increase minimum visible scale','zoomin':'Zoom in to meet set maximum',},currentValue:limits.method,fieldClass:'form-select-sm',events:{change:(e)=>{const field=e.target
const value=field.value
limits.method=value
if(limits.active)updateLeafletGeoJSONLayer(layer,{controller,})}}},},className:'flex-wrap gap-2'},'Filter':{fields:{enableType:{handler:createFormCheck,checked:filters.type.active,formCheckClass:'flex-grow-1',labelInnerText:'Filter by type',role:'switch',events:{click:(e)=>{const value=e.target.checked
if(value===filters.type.active)return
Object.keys(form.elements).filter(i=>i.startsWith('typeFilter-')).forEach(i=>{form.elements[i].disabled=!value})
filters.type.active=value
updateLeafletGeoJSONLayer(layer,{geojson:value?layer.toGeoJSON():null,controller,})}}},toggleType:{handler:createButton,name:'typeFilter-toggle',className:'fs-12 bg-transparent border-0 p-0 ms-2',iconSpecs:'bi bi-toggles',title:'Toggle all types',disabled:!filters.type.active,events:{click:()=>{const fields=Object.values(form.elements).filter(f=>{return f.getAttribute&&(f.getAttribute('name')||'').startsWith('typeFilter-')&&f.getAttribute('type')==='checkbox'})
const check=fields.some(f=>!f.checked)
fields.forEach(field=>{field.checked=check
const name=form.querySelector(`label[for="${field.id}"]`).innerText
filters.type.values[name]=check})
updateLeafletGeoJSONLayer(layer,{controller,})}}},typeFilter:{handler:createCheckboxOptions,name:'typeFilter',containerClass:'p-3 border rounded flex-wrap flex-grow-1 w-100 gap-2 mb-3',options:(()=>{const options={}
for(const type in filters.type.values){options[type]={checked:filters.type.values[type],disabled:!filters.type.active,events:{click:()=>{Object.values(form.elements).filter(f=>{return f.getAttribute&&(f.getAttribute('name')||'').startsWith('typeFilter-')&&f.getAttribute('type')==='checkbox'}).forEach(field=>{const option=form.querySelector(`label[for="${field.id}"]`).innerText
filters.type.values[option]=field.checked})
updateLeafletGeoJSONLayer(layer,{controller,})}}}}
return options})()},enableProps:{handler:createFormCheck,checked:filters.properties.active,formCheckClass:'flex-grow-1',labelInnerText:'Filter by properties',role:'switch',events:{click:(e)=>{const propertyFilters=filters.properties
const value=e.target.checked
if(value===propertyFilters.active)return
Object.keys(form.elements).filter(i=>i.startsWith('propFilter-')).forEach(i=>{form.elements[i].disabled=!value})
body.querySelector(`#${filterContainerId}-prop`).querySelectorAll('.tagify').forEach(i=>{value?i.removeAttribute('disabled'):i.setAttribute('disabled',true)})
propertyFilters.active=value
if(Object.values(propertyFilters.values??{}).some(i=>{return i.active&&i.property&&i.values.length}))updateLeafletGeoJSONLayer(layer,{geojson:value?layer.toGeoJSON():null,controller,})}}},operatorProps:{handler:createBadgeSelect,selectClass:`border-0 p-0 pe-1 text-end text-secondary text-bg-${getPreferredTheme()}`,attrs:{name:'propFilter-operator'},disabled:!filters.properties.active,options:{'':'Select an operator','&&':'&&','||':'||',},events:{change:(e)=>{const propertyFilters=filters.properties
let value=e.target.value
if(value==='')value=e.target.value=propertyFilters.operator
if(value===propertyFilters.operator)return
propertyFilters.operator=value
if(Object.values(propertyFilters.values??{}).some(i=>{return i.active&&i.property&&i.values.length}))updateLeafletGeoJSONLayer(layer,{controller,})}},currentValue:filters.properties.operator,},newProp:{handler:createButton,name:'propFilter-new',className:'fs-12 bg-transparent border-0 p-0 ms-2',iconSpecs:'bi bi-plus-lg',title:'Add a new property filter',disabled:!filters.properties.active,events:{click:()=>{const id=generateRandomString()
filters.properties.values[id]={active:true,handler:'equals',case:true,value:true,values:[],}
body.querySelector(`#${filterContainerId}-prop`).appendChild(getPropertyFilterForm(id))}}},toggleProp:{handler:createButton,name:'propFilter-toggle',className:'fs-12 bg-transparent border-0 p-0 ms-2',iconSpecs:'bi bi-toggles',title:'Toggle all property filters',disabled:!filters.properties.active,events:{click:()=>{const fields=Object.values(form.elements).filter(f=>{return(f.getAttribute('name')||'').startsWith('propFilter-')&&f.getAttribute('type')==='checkbox'})
const check=fields.every(f=>!f.checked)
fields.forEach(field=>{field.checked=check})
Object.values(filters.properties.values).forEach(f=>f.active=check)
updateLeafletGeoJSONLayer(layer,{controller,})}}},removeProp:{handler:createButton,name:'propFilter-remove',className:'fs-12 bg-transparent border-0 p-0 ms-2',iconSpecs:'bi bi-trash-fill',title:'Remove all property filters',disabled:!filters.properties.active,events:{click:()=>{const propertyFilters=filters.properties
body.querySelector(`#${filterContainerId}-prop`).innerHTML=''
propertyFilters.values={}
if(Object.values(propertyFilters.values??{}).some(i=>{return i.active&&i.property&&i.values.length}))updateLeafletGeoJSONLayer(layer,{controller,})}}},propFilter:{handler:({parent}={})=>{const container=customCreateElement({id:`${filterContainerId}-prop`,className:'d-flex flex-column w-100 gap-2',parent,})
for(const id in filters.properties.values){container.appendChild(getPropertyFilterForm(id))}}},enableGeom:{handler:createFormCheck,checked:filters.geom.active,formCheckClass:'flex-grow-1',labelInnerText:'Filter by geometry',role:'switch',events:{click:(e)=>{const value=e.target.checked
if(value===filters.geom.active)return
Object.keys(form.elements).filter(i=>i.startsWith('geomFilter-')).forEach(i=>{form.elements[i].disabled=!value})
filters.geom.active=value
if(Object.keys(filters.geom.values||{}).length)updateLeafletGeoJSONLayer(layer,{geojson:value?layer.toGeoJSON():null,controller,})}}},operatorGeom:{handler:createBadgeSelect,selectClass:`border-0 p-0 pe-1 text-end text-secondary text-bg-${getPreferredTheme()}`,attrs:{name:'geomFilter-operator'},disabled:!filters.geom.active,options:{'':'Select an operator','&&':'&&','||':'||',},currentValue:filters.properties.operator,events:{change:(e)=>{let value=e.target.value
if(value==='')value=e.target.value=filters.geom.operator
if(value===filters.geom.operator)return
filters.geom.operator=value
if(Object.keys(filters.geom.values||{}).length)updateLeafletGeoJSONLayer(layer,{controller,})}},},newGeom:{handler:createButton,name:'geomFilter-new',className:'fs-12 bg-transparent border-0 p-0 ms-2',iconSpecs:'bi bi-plus-lg',title:'Add a new spatial constraint',disabled:!filters.geom.active,events:{click:()=>{const id=generateRandomString()
filters.geom.values[id]={active:true,handler:'booleanIntersects',value:true,geoms:[],}
body.querySelector(`#${filterContainerId}-geom`).appendChild(getGeomFilterForm(id))}}},bboxGeom:{handler:createButton,name:'geomFilter-bbox',className:'fs-12 bg-transparent border-0 p-0 ms-2',iconSpecs:'bi bi-bounding-box-circles',title:'Add map extent as spatial constraint',disabled:!filters.geom.active,events:{click:()=>{const id=generateRandomString()
filters.geom.values[id]={active:true,handler:'booleanIntersects',value:true,geoms:[turf.bboxPolygon(getLeafletMapBbox(map)).geometry]}
body.querySelector(`#${filterContainerId}-geom`).appendChild(getGeomFilterForm(id))
updateLeafletGeoJSONLayer(layer,{controller,})}}},toggleGeom:{handler:createButton,name:'geomFilter-toggle',className:'fs-12 bg-transparent border-0 p-0 ms-2',iconSpecs:'bi bi-toggles',title:'Toggle all spatial constraints',disabled:!filters.geom.active,events:{click:()=>{const fields=Object.values(form.elements).filter(f=>{if(!f.getAttribute)return
return(f.getAttribute('name')||'').startsWith('geomFilter-')&&f.getAttribute('type')==='checkbox'})
const check=fields.every(f=>!f.checked)
fields.forEach(field=>{field.checked=check})
Object.values(filters.geom.values).forEach(f=>f.active=check)
updateLeafletGeoJSONLayer(layer,{controller,})}}},removeGeom:{handler:createButton,name:'geomFilter-remove',className:'fs-12 bg-transparent border-0 p-0 ms-2',iconSpecs:'bi bi-trash-fill',title:'Remove all spatial constraints',disabled:!filters.geom.active,events:{click:()=>{body.querySelector(`#${filterContainerId}-geom`).innerHTML=''
const update=Object.values(filters.geom.values).some(f=>f.active&&f.geoms?.length)
filters.geom.values={}
if(update)updateLeafletGeoJSONLayer(layer,{controller,})}}},geomFilter:{handler:({parent}={})=>{const container=customCreateElement({id:`${filterContainerId}-geom`,className:'d-flex flex-column w-100 gap-2',parent,})
for(const id in filters.geom.values){container.appendChild(getGeomFilterForm(id))}}},},className:'flex-wrap gap-2'},'Transform Geometries':{fields:{enableSimplify:{handler:createFormCheck,checked:transformations.simplify.active,formCheckClass:'flex-grow-1 w-100',labelInnerText:'Simplify feature geometries',role:'switch',events:{click:(e)=>{const value=e.target.checked
if(value===transformations.simplify.active)return
Array.from(form.simplify).forEach(f=>{f.disabled=!value})
transformations.simplify.active=value
updateLeafletGeoJSONLayer(layer,{geojson:value?layer.toGeoJSON():null,controller,})}}},simplifyOptions:{handler:({parent}={})=>{const container=createCheckboxOptions({parent,name:'simplify',type:'radio',containerClass:'p-3 border rounded flex-wrap flex-grow-1 w-100 gap-2',options:(()=>{const options={}
for(const i in transformations.simplify.values){const params=transformations.simplify.values[i]
options[i]={checked:params.active,disabled:!transformations.simplify.active,inputAttrs:{value:params.fn},events:{click:()=>{let changed=false
Array.from(form.simplify).forEach(f=>{const name=form.querySelector(`label[for="${f.id}"]`).innerText
if(transformations.simplify.values[name].active===f.checked)return
transformations.simplify.values[name].active=f.checked
changed=true})
if(changed)updateLeafletGeoJSONLayer(layer,{controller,})},}}}
return options})()})
const simplify=transformations.simplify.values['Simplify by tolerance']
const simplifyToggle=container.lastChild
const simplifyContainer=customCreateElement({parent:container,className:'d-flex gap-2 flex-nowrap',})
simplifyContainer.appendChild(simplifyToggle)
const toleranceField=customCreateElement({parent:simplifyContainer,className:'rounded border-0 small px-2',tag:'input',attrs:{type:'number',min:0,step:0.0001,placeholder:'Tolerance',value:simplify.options.tolerance},events:{change:(e)=>{const value=e.target.value
if(value===''||isNaN(value)){e.target.value=simplify.options.tolerance
return}
simplify.options.tolerance=Number(value)
if(simplify.active)updateLeafletGeoJSONLayer(layer,{controller,})}}})},},transformScaleCheck:{handler:createFormCheck,checked:transformations.simplify.scale.active,formCheckClass:'w-25 border rounded py-1 pe-2 ps-4',formCheckStyle:{height:'32px'},labelInnerText:'Scale',role:'checkbox',events:{click:(e)=>{const value=e.target.checked
if(value===transformations.simplify.scale.active)return
form.elements.transformScaleMin.disabled=!value
form.elements.transformScaleMax.disabled=!value
transformations.simplify.scale.active=value
updateLeafletGeoJSONLayer(layer,{controller})}}},transformScaleMin:{handler:createInputGroup,fieldAttrs:{name:'transformScaleMin',type:'number',min:'10',max:transformations.simplify.scale.max,step:'10',value:transformations.simplify.scale.min,placeholder:'Maximum',},prefixHTML:`<span class="fs-12">1:</span>`,suffixHTML:`<span class="fs-12">m</span>`,fieldClass:'form-control-sm fs-12',disabled:!transformations.simplify.scale.active,inputGroupClass:'w-25 flex-grow-1',events:{'change':(e)=>{const field=e.target
const maxScaleField=form.elements.transformScaleMax
if(!field.value){field.value=10}else{const maxScaleValue=parseInt(maxScaleField.value)
if(maxScaleValue<parseInt(field.value))field.value=maxScaleValue}
transformations.simplify.scale.min=parseInt(field.value)
maxScaleField.setAttribute('min',field.value)
updateLeafletGeoJSONLayer(layer,{controller})},'click':visibilityFieldsClick,}},transformScaleMax:{handler:createInputGroup,fieldAttrs:{name:'transformScaleMax',type:'number',min:transformations.simplify.scale.min,max:'5000000',step:'10',value:transformations.simplify.scale.max,placeholder:'Minimum',},prefixHTML:`<span class="fs-12">1:</span>`,suffixHTML:`<span class="fs-12">m</span>`,fieldClass:'form-control-sm fs-12',disabled:!transformations.simplify.scale.active,inputGroupClass:'w-25 flex-grow-1',events:{'change':(e)=>{const field=e.target
const minScaleField=form.elements.transformScaleMin
if(!field.value){field.value=5000000}else{const minScaleValue=parseInt(minScaleField.value)
if(minScaleValue>parseInt(field.value))field.value=minScaleValue}
transformations.simplify.scale.max=parseInt(field.value)
minScaleField.setAttribute('max',field.value)
updateLeafletGeoJSONLayer(layer,{controller})},'click':visibilityFieldsClick,}},},className:'flex-wrap gap-2'}}:{})}}
Object.keys(styleFields).forEach(categoryName=>{const category=document.createElement('div')
category.className=`d-flex flex-column gap-2`
body.appendChild(category)
const categoryCollase=document.createElement('div')
categoryCollase.id=generateRandomString()
categoryCollase.className='collapse show'
const categoryHeader=document.createElement('div')
categoryHeader.className=`d-flex fw-medium`
categoryHeader.setAttribute('data-bs-toggle','collapse')
categoryHeader.setAttribute('aria-expanded','true')
categoryHeader.setAttribute('data-bs-target',`#${categoryCollase.id}`)
categoryHeader.setAttribute('aria-controls',categoryCollase.id)
categoryHeader.style.cursor='pointer'
const categoryLabel=document.createElement('span')
categoryLabel.innerText=categoryName
categoryHeader.appendChild(categoryLabel)
createIcon({className:'dropdown-toggle ms-auto',parent:categoryHeader,peNone:true})
category.appendChild(categoryHeader)
category.appendChild(categoryCollase)
const categorySections=document.createElement('div')
categorySections.className='d-flex flex-column gap-3'
categoryCollase.appendChild(categorySections)
const sections=styleFields[categoryName]
Object.keys(sections).forEach(sectionName=>{const data=sections[sectionName]
const section=document.createElement('div')
section.className=`d-flex flex-column gap-2`
categorySections.appendChild(section)
const sectionCollase=document.createElement('div')
sectionCollase.id=data.id??generateRandomString()
sectionCollase.className='collapse show'
const sectionHeader=document.createElement('div')
sectionHeader.className=`d-flex fw-normal`
sectionHeader.setAttribute('data-bs-toggle','collapse')
sectionHeader.setAttribute('aria-expanded','true')
sectionHeader.setAttribute('data-bs-target',`#${sectionCollase.id}`)
sectionHeader.setAttribute('aria-controls',sectionCollase.id)
sectionHeader.style.cursor='pointer'
const sectionLabel=document.createElement('span')
sectionLabel.innerText=sectionName
sectionHeader.appendChild(sectionLabel)
createIcon({className:'dropdown-toggle ms-auto',parent:sectionHeader,peNone:true})
section.appendChild(sectionHeader)
section.appendChild(sectionCollase)
const sectionFields=document.createElement('div')
sectionFields.className=`d-flex align-items-center w-100 ${data.className}`
sectionCollase.appendChild(sectionFields)
const fields=data.fields
Object.keys(fields).forEach(fieldName=>{const params=fields[fieldName]
if(params?.handler)params.handler({...params,parent:sectionFields,})})})})})};const handleLeafletQueryPanel=(map,parent)=>{let controller=resetController()
const toolHandler=async(e,handler)=>{await clearLayers(tools)
if(typeof handler!=='function')return
controller=resetController({controller,message:'New query started.'})
spinner.classList.remove('d-none')
const cancelBtn=getCancelBtn()
cancelBtn.disabled=false
errorRemark='Query was interrupted.'
await handler(e,{controller,abortBtns:[getCancelBtn()],})
cancelBtn.disabled=true
spinner.classList.add('d-none')
if(layers.innerHTML===''){error.lastChild.innerText=errorRemark
error.classList.remove('d-none')}}
const queryGroup=map._handlers.getLayerGroups().query
const{toolbar,layers,status,spinner,error,clearLayers,toolsHandler,}=createLeafletMapPanel(map,parent,'query',{statusBar:true,spinnerRemark:'Running query...',clearLayersHandler:()=>queryGroup.clearLayers(),toolHandler,})
const customStyleParams={fillColor:'hsla(111, 100%, 54%, 1)',strokeWidth:1,}
let errorRemark
const getCancelBtn=()=>toolbar.querySelector(`#${toolbar.id}-cancel`)
const enableToolbar=()=>{toolbar.querySelector(`#${toolbar.id}-clear`).disabled=false
if(layers.querySelectorAll('.collapse').length){toolbar.querySelector(`#${toolbar.id}-collapse`).disabled=false}
const checkboxes=layers.querySelectorAll('input.form-check-input[type="checkbox"]')
if(checkboxes.length){toolbar.querySelector(`#${toolbar.id}-zoomin`).disabled=false
if(Array.from(checkboxes).some(c=>!c.disabled)){toolbar.querySelector(`#${toolbar.id}-visibility`).disabled=false}}
layers.classList.remove('d-none')}
const getOSMDataFetchers=({types=ALL_OVERPASS_ELEMENT_TYPES,tags=''}={})=>{return[{key:'nominatim;{}',title:'OpenStreetMap element via Nominatim API',},{key:`overpass;${JSON.stringify({params:{types,tags}})}`,title:removeWhitespace(`OpenStreetMap ${
                types.length === 1 ? types[0] : 'elements'
            } ${
                tags ? `for ${tags.replaceAll('"','').replaceAll('[','').split(']').filter(i=>i).join(', ')}` : ''
            } via Overpass API`),},]}
const dataToChecklist=async(fetchers,{queryGeom,abortBtns,controller,event}={})=>{for(const fetcher of fetchers){const geojson=await getGeoJSON(fetcher.key,{queryGeom,zoom:map.getZoom(),abortBtns,controller,sort:true,event,})
if(!geojson?.features)continue
if(!geojson.features.length){errorRemark='Query returned no results.'}
const layer=await getLeafletGeoJSONLayer({geojson,pane:'queryPane',group:queryGroup,customStyleParams,params:{title:fetcher.title,attribution:createAttributionTable(geojson)?.outerHTML,type:'geojson',}})
const content=createGeoJSONChecklist(layer,{controller})
if(content){layers.appendChild(content)
enableToolbar()}}}
const tools=toolsHandler({osmPoint:{iconSpecs:'bi-pin-map-fill',title:'Query OpenStreetMap at point',altShortcut:'w',mapClickHandler:async(e,{abortBtns,controller}={})=>{const queryGeom=turf.point(Object.values(e.latlng).reverse())
await dataToChecklist(getOSMDataFetchers(),{queryGeom,abortBtns,controller})}},osmView:{iconSpecs:'bi-bounding-box-circles',title:'Query OpenStreetMap in map view',altShortcut:'e',toolHandler:false,btnClickHandler:async(e,{abortBtns,controller}={})=>{const container=customCreateElement({className:'px-3 fs-12 flex-column d-flex gap-2'})
const checkboxes=createCheckboxOptions({parent:container,containerClass:'gap-3',options:{'node':{checked:true,},'way':{checked:true,},'relation':{checked:true,},}})
const overpassTagListId=generateRandomString()
let filterDatalistUpdateTimeout
const filterField=createFormFloating({parent:container,fieldAttrs:{name:'overpassTag',list:overpassTagListId},labelText:'Overpass tag/s (case-sensitive)',events:{input:(e)=>{clearTimeout(filterDatalistUpdateTimeout)
filterDatalistUpdateTimeout=setTimeout(async()=>{const filterDatalist=container.querySelector(`#${overpassTagListId}`)
filterDatalist.innerHTML=''
let tags=[]
const by_value=await(await fetchTimeout(`https://taginfo.openstreetmap.org/api/4/search/by_value?query=${e.target.value}`))?.json()??[]
by_value.data.reverse().splice(0,10).forEach(i=>{tags.push(`["${i.key}"${i.value ? `="${i.value}"` : ''}]`)})
const by_keyword=await(await fetchTimeout(`https://taginfo.openstreetmap.org/api/4/search/by_keyword?query=${e.target.value}`))?.json()??[]
by_keyword.data.forEach(i=>tags.push(`["${i.key}"${i.value ? `="${i.value}"` : ''}]`))
tags=Array.from(new Set(tags))
tags.forEach(i=>filterDatalist.appendChild(customCreateElement({tag:'option',attrs:{value:i},})))},500)}}})
const filterDatalist=customCreateElement({parent:container,tag:'datalist',id:overpassTagListId,})
const link=customCreateElement({parent:container,tag:'span',attrs:{tabindex:'-1'},innerHTML:'For more info check out <a href="https://taginfo.openstreetmap.org/tags" target="_blank" tabindex="-1">taginfo.openstreetmap.org</a>'})
const queryBtn=createButton({parent:container,innerText:'Query',className:'btn-sm btn-primary fs-12',attrs:{type:'button'},events:{click:async(e)=>{await toolHandler(e,async(e)=>{const types=Array.from(container.querySelectorAll('.form-check-input')).filter(i=>i.checked).map(i=>i.value)
const tags=cleanOverpassTags(container.querySelector('input[name="overpassTag"]').value)
menuContainer.remove()
const queryGeom=turf.bboxPolygon(getLeafletMapBbox(map)).geometry
const params=getOSMDataFetchers({types,tags})
await dataToChecklist(params,{queryGeom,abortBtns,controller})})}}})
const menuContainer=contextMenuHandler(e,{confirm:{child:container}},{title:'Overpass API filters',dismissBtn:true})}},layerPoint:{iconSpecs:'bi-stack',title:'Query layers at point',altShortcut:'r',mapClickHandler:async(e,{abortBtns,controller}={})=>{const fetchers=Object.entries(map._legendLayerGroups.reduce((acc,group)=>{group.eachLayer(layer=>{if(acc[layer._indexedDBKey]?.includes(layer._params.title))return
if(!map.hasLayer(layer))return
acc[layer._indexedDBKey]=[...(acc[layer._indexedDBKey]??[]),layer._params.title]})
return acc},{})).map(i=>{return{key:i[0],title:i[1].join(' / ')}})
if(!fetchers.length){errorRemark='No layers to query.'
return}
const queryGeom=turf.point(Object.values(e.latlng).reverse())
await dataToChecklist(fetchers,{queryGeom,abortBtns,controller,event:e})}},divider1:{tag:'div',className:'vr m-2',},cancel:{iconSpecs:'bi-arrow-counterclockwise',title:'Cancel ongoing query',disabled:true,},divider2:{tag:'div',className:'vr m-2',},zoomin:{iconSpecs:'bi bi-zoom-in',title:'Zoom to layers',toolHandler:false,disabled:true,btnClickHandler:async()=>{const bounds=Array.from(layers.querySelectorAll('input.form-check-input')).map(checkbox=>{const layer=checkbox._leafletLayer
if(layer instanceof L.GeoJSON){return L.rectangle(layer.getBounds()).toGeoJSON()}}).filter(bound=>bound)
if(!bounds.length)return
await zoomToLeafletLayer(L.geoJSON(turf.featureCollection(bounds)),map)},},visibility:{iconSpecs:'bi bi-eye',title:'Toggle visibility',toolHandler:false,disabled:true,btnClickHandler:()=>{const checkboxes=Array.from(layers.querySelectorAll('input.form-check-input'))
const hide=checkboxes.some(el=>el.checked)
checkboxes.forEach(el=>{if(el.checked===hide)el.click()})},},divider3:{tag:'div',className:'vr m-2',},collapse:{iconSpecs:'bi bi-chevron-up',title:'Collapse/expand',toolHandler:false,disabled:true,btnClickHandler:()=>toggleCollapseElements(layers),},clear:{iconSpecs:'bi-trash-fill',title:'Clear query results',disabled:true,btnClickHandler:true},})};const handleLeafletToolboxPanel=(map,parent)=>{const group=map._handlers.getLayerGroups().local
const templateFieldHandlers={vectorLayer:({label='Layer',required=true,value=null,validators=[]}={})=>{return{required,value,createElement:({parent,name,fieldParams}={})=>{return createInputGroup({parent,prefixHTML:`<span class='fs-12'>${label}</span>`,fieldTag:'select',fieldClass:'form-select-sm',fieldAttrs:{name},events:{focus:(e)=>{leafletMapLegendLayersToSelectOptions(map,e.target,{layer:fieldParams.value,validators:[(l)=>l instanceof L.GeoJSON].concat(validators),})
console.log('add workflow outputs as options')},change:(e)=>{const layerId=parseInt(e.target.value)
const layer=map._handlers.getLegendLayer(layerId)
fieldParams.value=layer??null},}})},}},dissolveFeatures:({label='Dissolve features',required=false,value=false,}={})=>{return{required,value,createElement:({parent,name,fieldParams}={})=>{return createFormCheck({parent,name,labelInnerText:label,fieldClass:'',formCheckClass:'border rounded py-2 pe-2 ps-4 flex-grow-1 w-25',checked:value,labelClass:'fs-12 text-wrap',events:{click:(e)=>fieldParams.value=e.target.checked},style:{}})}}},coveredFeatures:({label='Covered features',required=true,value='visible',}={})=>{return{required,value,createElement:({parent,name,fieldParams}={})=>{const container=customCreateElement({parent,className:'input-group d-flex flex-nowrap w-50 flex-grow-1'})
customCreateElement({parent:container,tag:'span',innerText:label,className:'fs-12 input-group-text',})
const checkbox=createCheckboxOptions({parent:container,name,type:'radio',containerClass:'p-2 rounded flex-wrap flex-grow-1 gap-2 fs-12 border flex-grow-1 rounded-start-0 border-start-0',options:(()=>{const methods={visible:'visible',stored:'stored',selected:'selected',}
const options={}
for(const method in methods){options[method]={checked:method===value,label:methods[method],events:{click:(e)=>fieldParams.value=e.target.value}}}
return options})()})
return container}}}}
const getInputLayerGeoJSON=async(layer,{coverage='visible',}={})=>{if(coverage==='visible'){return turf.clone(layer.toGeoJSON())}else{const storedData=turf.clone((await getFromGISDB(layer._indexedDBKey)).gisData)
if(coverage==='stored'){return storedData}
if(coverage==='selected'){return turf.featureCollection(storedData.features.filter(f=>{return(layer._selectedFeatures??[]).includes(f.properties.__gsl_id__)}))}}
return turf.featureCollection([])}
const tools={vectorTransform:{title:'Vector Transformation',tools:{dissolve:{title:'Dissolve features',details:{description:'Dissolve features in a layer into multi-part features.',inputs:'vector layer',outputs:'vector layer',},fields:{layer:templateFieldHandlers['vectorLayer'](),coverage:templateFieldHandlers['coveredFeatures'](),},handler:async(params)=>{const inputLayer=params.layer
let geojson=await getInputLayerGeoJSON(inputLayer,{coverage:params.coverage})
geojson.features=(()=>{const id=JSON.parse(inputLayer._indexedDBKey.split(';')[1].split('--')[0]).id
const features={}
for(const i of['MultiPoint','MultiLineString','MultiPolygon']){features[i]={"type":"Feature","geometry":{"type":i,"coordinates":[]},"properties":{__dissolved__:id}}}
geojson.features.forEach(f=>{const geomType=f.geometry.type
if(geomType.startsWith('Multi')){features[geomType].geometry.coordinates=[...features[geomType].geometry.coordinates,...f.geometry.coordinates]}else{features[`Multi${geomType}`].geometry.coordinates.push(f.geometry.coordinates)}})
return Object.values(features)})()
const layer=await getLeafletGeoJSONLayer({geojson,group,pane:createCustomPane(map),params:{name:`${inputLayer._params.title} > dissolved`,}})
return layer}},toBounds:{title:'Features to Bounding Geometry',details:{description:removeWhitespace(`
                            Convert feature geometries in a vector layer to their bounding geometries.
                            Based on Turf.js
                            <a href="https://turfjs.org/docs/api/envelope" target="_blank">envelope</a>, 
                            <a href="https://turfjs.org/docs/api/bbox" target="_blank">bbox</a>,
                            <a href="https://turfjs.org/docs/api/square" target="_blank">square</a>,
                            <a href="https://turfjs.org/docs/api/bboxPolygon" target="_blank">bboxPolygon</a> and
                            <a href="https://turfjs.org/docs/api/convex" target="_blank">convex</a> functions.
                        `),inputs:'vector layer',outputs:'vector layer',},fields:{layer:templateFieldHandlers['vectorLayer'](),coverage:templateFieldHandlers['coveredFeatures'](),dissolve:templateFieldHandlers['dissolveFeatures'](),method:{required:true,value:null,createElement:({parent,name,fieldParams}={})=>{const container=customCreateElement({parent,className:'input-group d-flex flex-nowrap',})
const label=customCreateElement({parent:container,tag:'span',innerText:'Method',className:'input-group-text fs-12',})
const checkboxes=createCheckboxOptions({parent:container,name,type:'radio',containerClass:'p-2 rounded flex-wrap flex-grow-1 w-100 gap-2 fs-12 border rounded rounded-start-0 border-start-0',options:(()=>{const methods={envelope:'Envelope',square:'Square',convex:'Convex',}
const options={}
for(const method in methods){options[method]={checked:false,label:methods[method],events:{click:(e)=>fieldParams.value=e.target.value}}}
return options})()})
return container}},},handler:async(params)=>{const inputLayer=params.layer
let geojson=await getInputLayerGeoJSON(inputLayer,{coverage:params.coverage})
const handler=(()=>{const method=params.method
if(Array('envelope','convex').includes(method)){return turf[method]}
if(Array('square').includes(method)){return(d)=>{const bbox=turf.bbox(d)
const square=turf.square(bbox)
return turf.bboxPolygon(square)}}})()
if(params.dissolve){geojson=handler(geojson)}else{geojson.features=geojson.features.map(f=>{try{f.geometry=handler(f).geometry
return f}catch(error){return f}})}
const layer=await getLeafletGeoJSONLayer({geojson,group,pane:createCustomPane(map),params:{name:`${inputLayer._params.title} > ${params.dissolve ? 'layer' : 'feature'} ${params.method}`,}})
return layer}},toPoints:{title:'Features to Point/s',details:{description:'Convert features in a vector layer to point feature/s. Based on Turf.js <a href="https://turfjs.org/docs/api/centerMedian" target="_blank">functions</a>.',inputs:'vector layer',outputs:'vector layer',},fields:{layer:templateFieldHandlers['vectorLayer'](),coverage:templateFieldHandlers['coveredFeatures'](),dissolve:templateFieldHandlers['dissolveFeatures'](),method:{required:true,value:null,createElement:({parent,name,fieldParams}={})=>{const container=customCreateElement({parent,className:'input-group d-flex flex-nowrap',})
const label=customCreateElement({parent:container,tag:'span',innerText:'Method',className:'input-group-text fs-12',})
const checkboxes=createCheckboxOptions({parent:container,name,type:'radio',containerClass:'p-2 rounded flex-wrap flex-grow-1 w-100 gap-2 fs-12 border rounded rounded-start-0 border-start-0',options:(()=>{const methods={center:'Center',centerOfMass:'Center of mass',centroid:'Centroid',pointOnFeature:'Point on feature',}
const options={}
for(const method in methods){options[method]={checked:false,label:methods[method],events:{click:(e)=>{fieldParams.value=e.target.value}}}}
return options})()})
return container}},},handler:async(params)=>{const inputLayer=params.layer
const geojson=await getInputLayerGeoJSON(inputLayer,{coverage:params.coverage})
if(params.dissolve){geojson=turf[params.method](geojson)}else{geojson.features=geojson.features.map(f=>{f.geometry=turf[params.method](f).geometry
return f})}
const layer=await getLeafletGeoJSONLayer({geojson,group,pane:createCustomPane(map),params:{name:`${inputLayer._params.title} > ${params.dissolve ? 'layer' : 'feature'} ${params.method}`,}})
return layer}},flatten:{title:'Flatten Multi-part Geometries',details:{description:'Convert multi-part vector features in a layer into single-part features. Based on Turf.js <a href="https://turfjs.org/docs/api/flatten" target="_blank">flatten function</a>.',inputs:'vector layer',outputs:'vector layer',},fields:{layer:templateFieldHandlers['vectorLayer'](),coverage:templateFieldHandlers['coveredFeatures'](),},handler:async(params)=>{const inputLayer=params.layer
const geojson=await getInputLayerGeoJSON(inputLayer,{coverage:params.coverage})
geojson.features=geojson.features.flatMap(f=>{const newFeatures=turf.flatten(f).features
for(const index in newFeatures){const feature=newFeatures[index]
const properties=structuredClone(feature.properties)
const prefix=`flatten_index`
let propKey=`__${prefix}__`
let count=0
while(Object.keys(properties).includes(propKey)){count+=1
propKey=`__${prefix}_${count}__`}
properties[`${propKey}`]=index
properties[`__flattened_feature${count ? `_${count}` : ''}__`]=properties.__gsl_id__
delete properties.__gsl_id__
feature.properties=properties}
return newFeatures})
const layer=await getLeafletGeoJSONLayer({geojson,group,pane:createCustomPane(map),params:{name:`${inputLayer._params.title} > flattened`,}})
return layer}},unkink:{title:'Unkink Polygons',details:{description:'Convert self-intersecting polygon features in a layer into single-part features. Based on Turf.js <a href="https://turfjs.org/docs/api/unkinkPolygon" target="_blank">unkinkPolygon function</a>.',inputs:'vector layer',outputs:'vector layer',},fields:{layer:templateFieldHandlers['vectorLayer'](),coverage:templateFieldHandlers['coveredFeatures'](),},handler:async(params)=>{const inputLayer=params.layer
let geojson=await getInputLayerGeoJSON(inputLayer,{coverage:params.coverage})
geojson.features=geojson.features.flatMap(f=>{const newFeatures=turf.unkinkPolygon(f).features
for(const index in newFeatures){const feature=newFeatures[index]
const properties=structuredClone(feature.properties)
const prefix=`unkink_index`
let propKey=`__${prefix}__`
let count=0
while(Object.keys(properties).includes(propKey)){count+=1
propKey=`__${prefix}_${count}__`}
properties[`${propKey}`]=index
properties[`__unkinked_feature${count ? `_${count}` : ''}__`]=properties.__gsl_id__
delete properties.__gsl_id__
feature.properties=properties}
return newFeatures})
const layer=await getLeafletGeoJSONLayer({geojson,group,pane:createCustomPane(map),params:{name:`${inputLayer._params.title} > unkinked`,}})
return layer}},}},vectorFilter:{title:'Vector Filtering',tools:{typeFilter:{title:'Filter by Geometry Type',details:{description:'Extracts features with selected geomtry types from the input vector layer.',},fields:{layer:templateFieldHandlers['vectorLayer'](),coverage:templateFieldHandlers['coveredFeatures'](),types:{required:true,value:null,createElement:({parent,name,fieldParams}={})=>{const container=customCreateElement({parent,className:'input-group d-flex flex-nowrap',})
const label=customCreateElement({parent:container,tag:'span',innerText:'Geometry type',className:'input-group-text fs-12 text-wrap text-start',})
const field=createCheckboxOptions({parent:container,name,containerClass:'p-2 rounded flex-wrap flex-grow-1 w-100 gap-2 fs-12 border rounded rounded-start-0 border-start-0',options:(()=>{const options={}
for(const suffix of Array('Point','LineString','Polygon')){for(const type of Array(suffix,`Multi${suffix}`)){options[type]={checked:false,events:{click:(e)=>{const value=e.target.value
fieldParams.value=fieldParams.value??[]
if(e.target.checked){if(!fieldParams.value.includes(value)){fieldParams.value.push(value)}}else{fieldParams.value=fieldParams.value.filter(i=>i!==value)}
if(!fieldParams.value.length){fieldParams.value=null}}}}}}
return options})()})}}},handler:async(params)=>{const inputLayer=params.layer
const geojson=await getInputLayerGeoJSON(inputLayer,{coverage:params.coverage})
geojson.features=geojson.features.filter(f=>{return params.types.includes(f.geometry.type)})
const layer=await getLeafletGeoJSONLayer({geojson,group,pane:createCustomPane(map),params:{name:`${inputLayer._params.title} > filtered ${params.types.join(', ')}`,}})
return layer}},}}}
const searchContainer=customCreateElement({parent,id:`${parent.parentElement.id}-search`,className:'p-3 fs-12'})
const searchField=customCreateElement({parent:searchContainer,tag:'input',className:'ps-0 border-0 rounded-0 box-shadow-none bg-transparent w-100 fs-12',attrs:{type:'search',placeholder:'Search toolbox...'},events:{change:(e)=>{renderTools({keywords:e.target.value.trim().split(' ')})}}})
const toolsContainer=customCreateElement({parent,id:`${parent.parentElement.id}-tools`,className:'fs-12 d-flex flex-column border-top mb-3'})
const renderTools=({keywords=[]}={})=>{toolsContainer.innerHTML=''
for(const set in tools){const setParams=tools[set]
const setContainer=customCreateElement({id:`${toolsContainer.id}-${set}`,className:'d-flex flex-column',})
const setHeader=customCreateElement({parent:setContainer,className:'d-flex flex-nowrap justify-content-between fw-bold p-2 border-bottom',attrs:{'data-bs-toggle':"collapse",'data-bs-target':`#${setContainer.id}-collapse`,'aria-expanded':"true",'aria-controls':`${setContainer.id}-collapse`,}})
const setLabel=customCreateElement({parent:setHeader,tag:'span',className:'user-select-none',innerText:setParams.title})
const setToggle=customCreateElement({parent:setHeader,tag:'i',className:'dropdown-toggle',})
const setToolsCollapse=customCreateElement({parent:setContainer,id:`${setContainer.id}-collapse`,className:'collapse show'})
const setToolsContainer=customCreateElement({parent:setToolsCollapse,id:`${setContainer.id}-accordion`,className:'accordion d-flex flex-column rounded-0',})
for(const tool in setParams.tools){const toolParams=setParams.tools[tool]
const toolString=`${toolParams.title} | ${setParams.title} | ${toolParams.details.description}`.toLowerCase()
if(keywords.length&&keywords.every(k=>!toolString.includes(k.toLowerCase())))continue
const toolContainer=customCreateElement({parent:setToolsContainer,id:`${setContainer.id}-${tool}`,className:'accordion-item d-flex flex-column border-0 rounded-0',})
const toolHead=customCreateElement({parent:toolContainer,className:'accordion-header d-flex flex-nowrap justify-content-between p-2 ps-3 border-bottom',attrs:{'data-bs-toggle':"collapse",'data-bs-target':`#${toolContainer.id}-collapse`,'aria-expanded':"false",'aria-controls':`${toolContainer.id}-collapse`,}})
const toolLabel=customCreateElement({parent:toolHead,tag:'span',className:'user-select-none',innerText:toolParams.title})
const toolToggle=customCreateElement({parent:toolHead,tag:'i',className:'dropdown-toggle',})
const toolCollapse=customCreateElement({parent:toolContainer,id:`${toolContainer.id}-collapse`,className:'accordion-collapse collapse',attrs:{'data-bs-parent':`#${setContainer.id}-accordion`}})
const toolCollapseContainer=customCreateElement({parent:toolCollapse,className:'accordion-body d-flex flex-column gap-3 p-3 border-bottom'})
const toolDetails=customCreateElement({parent:toolCollapseContainer,className:'d-flex flex-column fs-12',})
const toolDesc=customCreateElement({parent:toolDetails,innerHTML:toolParams.details.description})
const toolForm=customCreateElement({parent:toolCollapseContainer,id:`${toolContainer.id}-form`,tag:'form',className:'d-flex flex-wrap gap-2'})
const toggleToolBtns=()=>{const disabled=Object.values(toolParams.fields).some(i=>i.required&&!i.value)
Array.from(toolForm.querySelectorAll(`#${toolForm.id}-btns > button`)).forEach(b=>b.disabled=disabled)}
for(const name in toolParams.fields){const fieldParams=toolParams.fields[name]
fieldParams.createElement({parent:toolForm,name,fieldParams,})}
Array.from(toolForm.querySelectorAll('[name]')).forEach(f=>f.addEventListener('change',toggleToolBtns))
const toolBtns=customCreateElement({parent:toolForm,id:`${toolForm.id}-btns`,attrs:{type:'button'},className:'d-flex flex-nowrap gap-1 justify-content-end w-100'})
const toolStart=customCreateElement({parent:toolBtns,tag:'button',attrs:{type:'button'},className:'badge btn btn-sm btn-success mt-2',innerText:'Run',events:{click:async(e)=>{const params={}
Object.keys(toolParams.fields).forEach(name=>params[name]=toolParams.fields[name].value)
const layer=await toolParams.handler(params)
if(layer){group.addLayer(layer)}}}})
toggleToolBtns()}
if(setToolsContainer.innerHTML!==''){toolsContainer.appendChild(setContainer)}}
if(toolsContainer.innerHTML===''){customCreateElement({parent:toolsContainer,innerText:'No matching tools found.',className:'border-bottom p-3'})}}
renderTools()};const getLeafletMap=(id)=>{return window.maps.find(i=>i.getContainer().id===id)}
const disableMapInteractivity=(map)=>{if(!map._enabledInteractivity||map._enabledInteractivity===true){map.dragging.disable()
map.touchZoom.disable()
map.doubleClickZoom.disable()
map.scrollWheelZoom.disable()
map._enabledInteractivity=false}}
const enableMapInteractivity=(map)=>{if(map._enabledInteractivity===false){map.dragging.enable()
map.touchZoom.enable()
map.doubleClickZoom.enable()
map.scrollWheelZoom.enable()
map._enabledInteractivity=true}}
const getLeafletMeterScale=(map)=>{if(!map)return
const meterScale=map._scaleBar?._mScale?.innerText
if(meterScale){const value=parseInt(meterScale)
return meterScale.includes('km')?(value*1000):value}
return leafletZoomToMeter(map.getZoom())}
const scaleToLeafletZoom=(scale)=>{const diff={}
for(i in leafletZoomToMeter()){const value=leafletZoomToMeter(i)
if(scale===value)return i
diff[Math.abs(scale-value)]=i}
return diff[Math.min(...Object.keys(diff))]}
const zoomLeafletMapToScale=(map,scale)=>{const mapZoom=map.getZoom()
const mapScale=leafletZoomToMeter(mapZoom)
const diff={}
if(mapScale>scale){for(let i=mapZoom;i<=20;i++){diff[Math.abs(scale-leafletZoomToMeter(i))]=i}}else{for(let i=1;i<=mapZoom;i++){diff[Math.abs(scale-leafletZoomToMeter(i))]=i}}
let newZoom=diff[Math.min(...Object.keys(diff))]
newZoom+=newZoom>15?1:0
map.setZoom(newZoom)
return newZoom}
const leafletLayerClickHandler=(e)=>{const layer=e.layer
const clickFns=layer?._events.click
if(!clickFns)return
layer._disabledClickFns=clickFns
delete layer._events.click}
const disableLeafletLayerClick=(map)=>{map.eachLayer(layer=>{const clickFns=layer._events.click
if(!clickFns)return
layer._disabledClickFns=clickFns
delete layer._events.click})
map.on('layeradd',leafletLayerClickHandler)}
const enableLeafletLayerClick=(map)=>{map.eachLayer(layer=>{const clickFns=layer._disabledClickFns
if(!clickFns)return
layer._events.click=clickFns
delete layer._disabledClickFns})
map.off('layeradd',leafletLayerClickHandler)}
const getLeafletMapBbox=(map)=>{const[w,s,e,n]=loopThroughCoordinates(map.getBounds(),validateLeafletLayerCoords).toBBoxString().split(',')
if(w<-180)w=-180
if(s<-90)s=-90
if(e>180)e=180
if(n>90)n=90
return[w,s,e,n]}
const zoomLeafletMapToBounds=(map,bounds,{zoom=18}={})=>{const b=bounds
if(!b)return
try{if(b.getNorth()===b.getSouth()&&b.getEast()===b.getWest()){return map.setView(b.getNorthEast(),zoom)}else{return map.fitBounds(b)}}catch(error){return}};;const handleLeafletMapContainer=async(map)=>{const container=map.getContainer()
const dataset=container.parentElement.dataset
container.className=`bg-${getPreferredTheme()} ${container.className} ${dataset.mapClass ?? ''}`
elementResizeObserver(container,()=>map.invalidateSize())}
const handleLeafletMapBasemap=async(map)=>{L.tileLayer("//tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',className:`layer-${getPreferredTheme()}`,maxZoom:20,}).addTo(map)}
const handleLeafletMapEvents=async(map)=>{map.on('popupopen',(e)=>{e.popup._container.querySelector('.leaflet-popup-content-wrapper').style.maxHeight=`${map.getSize().y * 0.5}px`})}
window.addEventListener("map:init",async(e)=>{const map=e.detail.map
handleLeafletMapContainer(map)
handleLeafletMapBasemap(map)
handleLeafletLayerGroups(map)
handleLeafletMapPanels(map)
handleLeafletMapControls(map)
handleLeafletMapEvents(map)
map._featureSelector=false
map._featureSelectorLayer=L.geoJSON()
map._featureSelectionCoords=[]
map._initComplete=true
map.fire('initComplete')});