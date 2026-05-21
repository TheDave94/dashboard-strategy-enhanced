/*! For license information please see oriel-editor.2c628134.js.LICENSE.txt */
"use strict";(self.webpackChunkoriel=self.webpackChunkoriel||[]).push([[8],{293(e,t,i){var n=i(618),o=i(745),r=i(781);function a(e){return null==e}var s={isNothing:a,isObject:function(e){return"object"==typeof e&&null!==e},toArray:function(e){return Array.isArray(e)?e:a(e)?[]:[e]},repeat:function(e,t){var i,n="";for(i=0;i<t;i+=1)n+=e;return n},isNegativeZero:function(e){return 0===e&&Number.NEGATIVE_INFINITY===1/e},extend:function(e,t){var i,n,o,r;if(t)for(i=0,n=(r=Object.keys(t)).length;i<n;i+=1)e[o=r[i]]=t[o];return e}};function c(e,t){var i="",n=e.reason||"(unknown reason)";return e.mark?(e.mark.name&&(i+='in "'+e.mark.name+'" '),i+="("+(e.mark.line+1)+":"+(e.mark.column+1)+")",!t&&e.mark.snippet&&(i+="\n\n"+e.mark.snippet),n+" "+i):n}function l(e,t){Error.call(this),this.name="YAMLException",this.reason=e,this.mark=t,this.message=c(this,!1),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=(new Error).stack||""}l.prototype=Object.create(Error.prototype),l.prototype.constructor=l,l.prototype.toString=function(e){return this.name+": "+c(this,e)};var d=l;function p(e,t,i,n,o){var r="",a="",s=Math.floor(o/2)-1;return n-t>s&&(t=n-s+(r=" ... ").length),i-n>s&&(i=n+s-(a=" ...").length),{str:r+e.slice(t,i).replace(/\t/g,"→")+a,pos:n-t+r.length}}function u(e,t){return s.repeat(" ",t-e.length)+e}var h=["kind","multi","resolve","construct","instanceOf","predicate","represent","representName","defaultStyle","styleAliases"],g=["scalar","sequence","mapping"],_=function(e,t){if(t=t||{},Object.keys(t).forEach(function(t){if(-1===h.indexOf(t))throw new d('Unknown option "'+t+'" is met in definition of "'+e+'" YAML type.')}),this.options=t,this.tag=e,this.kind=t.kind||null,this.resolve=t.resolve||function(){return!0},this.construct=t.construct||function(e){return e},this.instanceOf=t.instanceOf||null,this.predicate=t.predicate||null,this.represent=t.represent||null,this.representName=t.representName||null,this.defaultStyle=t.defaultStyle||null,this.multi=t.multi||!1,this.styleAliases=function(e){var t={};return null!==e&&Object.keys(e).forEach(function(i){e[i].forEach(function(e){t[String(e)]=i})}),t}(t.styleAliases||null),-1===g.indexOf(this.kind))throw new d('Unknown kind "'+this.kind+'" is specified for "'+e+'" YAML type.')};function m(e,t){var i=[];return e[t].forEach(function(e){var t=i.length;i.forEach(function(i,n){i.tag===e.tag&&i.kind===e.kind&&i.multi===e.multi&&(t=n)}),i[t]=e}),i}function f(e){return this.extend(e)}f.prototype.extend=function(e){var t=[],i=[];if(e instanceof _)i.push(e);else if(Array.isArray(e))i=i.concat(e);else{if(!e||!Array.isArray(e.implicit)&&!Array.isArray(e.explicit))throw new d("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");e.implicit&&(t=t.concat(e.implicit)),e.explicit&&(i=i.concat(e.explicit))}t.forEach(function(e){if(!(e instanceof _))throw new d("Specified list of YAML types (or a single Type object) contains a non-Type object.");if(e.loadKind&&"scalar"!==e.loadKind)throw new d("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");if(e.multi)throw new d("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.")}),i.forEach(function(e){if(!(e instanceof _))throw new d("Specified list of YAML types (or a single Type object) contains a non-Type object.")});var n=Object.create(f.prototype);return n.implicit=(this.implicit||[]).concat(t),n.explicit=(this.explicit||[]).concat(i),n.compiledImplicit=m(n,"implicit"),n.compiledExplicit=m(n,"explicit"),n.compiledTypeMap=function(){var e,t,i={scalar:{},sequence:{},mapping:{},fallback:{},multi:{scalar:[],sequence:[],mapping:[],fallback:[]}};function n(e){e.multi?(i.multi[e.kind].push(e),i.multi.fallback.push(e)):i[e.kind][e.tag]=i.fallback[e.tag]=e}for(e=0,t=arguments.length;e<t;e+=1)arguments[e].forEach(n);return i}(n.compiledImplicit,n.compiledExplicit),n};var y=f,v=new _("tag:yaml.org,2002:str",{kind:"scalar",construct:function(e){return null!==e?e:""}}),b=new _("tag:yaml.org,2002:seq",{kind:"sequence",construct:function(e){return null!==e?e:[]}}),x=new _("tag:yaml.org,2002:map",{kind:"mapping",construct:function(e){return null!==e?e:{}}}),w=new y({explicit:[v,b,x]}),$=new _("tag:yaml.org,2002:null",{kind:"scalar",resolve:function(e){if(null===e)return!0;var t=e.length;return 1===t&&"~"===e||4===t&&("null"===e||"Null"===e||"NULL"===e)},construct:function(){return null},predicate:function(e){return null===e},represent:{canonical:function(){return"~"},lowercase:function(){return"null"},uppercase:function(){return"NULL"},camelcase:function(){return"Null"},empty:function(){return""}},defaultStyle:"lowercase"}),C=new _("tag:yaml.org,2002:bool",{kind:"scalar",resolve:function(e){if(null===e)return!1;var t=e.length;return 4===t&&("true"===e||"True"===e||"TRUE"===e)||5===t&&("false"===e||"False"===e||"FALSE"===e)},construct:function(e){return"true"===e||"True"===e||"TRUE"===e},predicate:function(e){return"[object Boolean]"===Object.prototype.toString.call(e)},represent:{lowercase:function(e){return e?"true":"false"},uppercase:function(e){return e?"TRUE":"FALSE"},camelcase:function(e){return e?"True":"False"}},defaultStyle:"lowercase"});function k(e){return 48<=e&&e<=57||65<=e&&e<=70||97<=e&&e<=102}function S(e){return 48<=e&&e<=55}function A(e){return 48<=e&&e<=57}var z=new _("tag:yaml.org,2002:int",{kind:"scalar",resolve:function(e){if(null===e)return!1;var t,i=e.length,n=0,o=!1;if(!i)return!1;if("-"!==(t=e[n])&&"+"!==t||(t=e[++n]),"0"===t){if(n+1===i)return!0;if("b"===(t=e[++n])){for(n++;n<i;n++)if("_"!==(t=e[n])){if("0"!==t&&"1"!==t)return!1;o=!0}return o&&"_"!==t}if("x"===t){for(n++;n<i;n++)if("_"!==(t=e[n])){if(!k(e.charCodeAt(n)))return!1;o=!0}return o&&"_"!==t}if("o"===t){for(n++;n<i;n++)if("_"!==(t=e[n])){if(!S(e.charCodeAt(n)))return!1;o=!0}return o&&"_"!==t}}if("_"===t)return!1;for(;n<i;n++)if("_"!==(t=e[n])){if(!A(e.charCodeAt(n)))return!1;o=!0}return!(!o||"_"===t)},construct:function(e){var t,i=e,n=1;if(-1!==i.indexOf("_")&&(i=i.replace(/_/g,"")),"-"!==(t=i[0])&&"+"!==t||("-"===t&&(n=-1),t=(i=i.slice(1))[0]),"0"===i)return 0;if("0"===t){if("b"===i[1])return n*parseInt(i.slice(2),2);if("x"===i[1])return n*parseInt(i.slice(2),16);if("o"===i[1])return n*parseInt(i.slice(2),8)}return n*parseInt(i,10)},predicate:function(e){return"[object Number]"===Object.prototype.toString.call(e)&&e%1==0&&!s.isNegativeZero(e)},represent:{binary:function(e){return e>=0?"0b"+e.toString(2):"-0b"+e.toString(2).slice(1)},octal:function(e){return e>=0?"0o"+e.toString(8):"-0o"+e.toString(8).slice(1)},decimal:function(e){return e.toString(10)},hexadecimal:function(e){return e>=0?"0x"+e.toString(16).toUpperCase():"-0x"+e.toString(16).toUpperCase().slice(1)}},defaultStyle:"decimal",styleAliases:{binary:[2,"bin"],octal:[8,"oct"],decimal:[10,"dec"],hexadecimal:[16,"hex"]}}),E=new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"),O=/^[-+]?[0-9]+e/,q=new _("tag:yaml.org,2002:float",{kind:"scalar",resolve:function(e){return null!==e&&!(!E.test(e)||"_"===e[e.length-1])},construct:function(e){var t,i;return i="-"===(t=e.replace(/_/g,"").toLowerCase())[0]?-1:1,"+-".indexOf(t[0])>=0&&(t=t.slice(1)),".inf"===t?1===i?Number.POSITIVE_INFINITY:Number.NEGATIVE_INFINITY:".nan"===t?NaN:i*parseFloat(t,10)},predicate:function(e){return"[object Number]"===Object.prototype.toString.call(e)&&(e%1!=0||s.isNegativeZero(e))},represent:function(e,t){var i;if(isNaN(e))switch(t){case"lowercase":return".nan";case"uppercase":return".NAN";case"camelcase":return".NaN"}else if(Number.POSITIVE_INFINITY===e)switch(t){case"lowercase":return".inf";case"uppercase":return".INF";case"camelcase":return".Inf"}else if(Number.NEGATIVE_INFINITY===e)switch(t){case"lowercase":return"-.inf";case"uppercase":return"-.INF";case"camelcase":return"-.Inf"}else if(s.isNegativeZero(e))return"-0.0";return i=e.toString(10),O.test(i)?i.replace("e",".e"):i},defaultStyle:"lowercase"}),j=w.extend({implicit:[$,C,z,q]}),T=j,D=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"),F=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"),I=new _("tag:yaml.org,2002:timestamp",{kind:"scalar",resolve:function(e){return null!==e&&(null!==D.exec(e)||null!==F.exec(e))},construct:function(e){var t,i,n,o,r,a,s,c,l=0,d=null;if(null===(t=D.exec(e))&&(t=F.exec(e)),null===t)throw new Error("Date resolve error");if(i=+t[1],n=+t[2]-1,o=+t[3],!t[4])return new Date(Date.UTC(i,n,o));if(r=+t[4],a=+t[5],s=+t[6],t[7]){for(l=t[7].slice(0,3);l.length<3;)l+="0";l=+l}return t[9]&&(d=6e4*(60*+t[10]+ +(t[11]||0)),"-"===t[9]&&(d=-d)),c=new Date(Date.UTC(i,n,o,r,a,s,l)),d&&c.setTime(c.getTime()-d),c},instanceOf:Date,represent:function(e){return e.toISOString()}}),L=new _("tag:yaml.org,2002:merge",{kind:"scalar",resolve:function(e){return"<<"===e||null===e}}),M="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r",P=new _("tag:yaml.org,2002:binary",{kind:"scalar",resolve:function(e){if(null===e)return!1;var t,i,n=0,o=e.length,r=M;for(i=0;i<o;i++)if(!((t=r.indexOf(e.charAt(i)))>64)){if(t<0)return!1;n+=6}return n%8==0},construct:function(e){var t,i,n=e.replace(/[\r\n=]/g,""),o=n.length,r=M,a=0,s=[];for(t=0;t<o;t++)t%4==0&&t&&(s.push(a>>16&255),s.push(a>>8&255),s.push(255&a)),a=a<<6|r.indexOf(n.charAt(t));return 0==(i=o%4*6)?(s.push(a>>16&255),s.push(a>>8&255),s.push(255&a)):18===i?(s.push(a>>10&255),s.push(a>>2&255)):12===i&&s.push(a>>4&255),new Uint8Array(s)},predicate:function(e){return"[object Uint8Array]"===Object.prototype.toString.call(e)},represent:function(e){var t,i,n="",o=0,r=e.length,a=M;for(t=0;t<r;t++)t%3==0&&t&&(n+=a[o>>18&63],n+=a[o>>12&63],n+=a[o>>6&63],n+=a[63&o]),o=(o<<8)+e[t];return 0==(i=r%3)?(n+=a[o>>18&63],n+=a[o>>12&63],n+=a[o>>6&63],n+=a[63&o]):2===i?(n+=a[o>>10&63],n+=a[o>>4&63],n+=a[o<<2&63],n+=a[64]):1===i&&(n+=a[o>>2&63],n+=a[o<<4&63],n+=a[64],n+=a[64]),n}}),N=Object.prototype.hasOwnProperty,U=Object.prototype.toString,R=new _("tag:yaml.org,2002:omap",{kind:"sequence",resolve:function(e){if(null===e)return!0;var t,i,n,o,r,a=[],s=e;for(t=0,i=s.length;t<i;t+=1){if(n=s[t],r=!1,"[object Object]"!==U.call(n))return!1;for(o in n)if(N.call(n,o)){if(r)return!1;r=!0}if(!r)return!1;if(-1!==a.indexOf(o))return!1;a.push(o)}return!0},construct:function(e){return null!==e?e:[]}}),Y=Object.prototype.toString,V=new _("tag:yaml.org,2002:pairs",{kind:"sequence",resolve:function(e){if(null===e)return!0;var t,i,n,o,r,a=e;for(r=new Array(a.length),t=0,i=a.length;t<i;t+=1){if(n=a[t],"[object Object]"!==Y.call(n))return!1;if(1!==(o=Object.keys(n)).length)return!1;r[t]=[o[0],n[o[0]]]}return!0},construct:function(e){if(null===e)return[];var t,i,n,o,r,a=e;for(r=new Array(a.length),t=0,i=a.length;t<i;t+=1)n=a[t],o=Object.keys(n),r[t]=[o[0],n[o[0]]];return r}}),W=Object.prototype.hasOwnProperty,B=new _("tag:yaml.org,2002:set",{kind:"mapping",resolve:function(e){if(null===e)return!0;var t,i=e;for(t in i)if(W.call(i,t)&&null!==i[t])return!1;return!0},construct:function(e){return null!==e?e:{}}}),H=T.extend({implicit:[I,L],explicit:[P,R,V,B]}),K=Object.prototype.hasOwnProperty,G=/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,Z=/[\x85\u2028\u2029]/,Q=/[,\[\]\{\}]/,J=/^(?:!|!!|![a-z\-]+!)$/i,X=/^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;function ee(e){return Object.prototype.toString.call(e)}function te(e){return 10===e||13===e}function ie(e){return 9===e||32===e}function ne(e){return 9===e||32===e||10===e||13===e}function oe(e){return 44===e||91===e||93===e||123===e||125===e}function re(e){var t;return 48<=e&&e<=57?e-48:97<=(t=32|e)&&t<=102?t-97+10:-1}function ae(e){return 120===e?2:117===e?4:85===e?8:0}function se(e){return 48<=e&&e<=57?e-48:-1}function ce(e){return 48===e?"\0":97===e?"":98===e?"\b":116===e||9===e?"\t":110===e?"\n":118===e?"\v":102===e?"\f":114===e?"\r":101===e?"":32===e?" ":34===e?'"':47===e?"/":92===e?"\\":78===e?"":95===e?" ":76===e?"\u2028":80===e?"\u2029":""}function le(e){return e<=65535?String.fromCharCode(e):String.fromCharCode(55296+(e-65536>>10),56320+(e-65536&1023))}function de(e,t,i){"__proto__"===t?Object.defineProperty(e,t,{configurable:!0,enumerable:!0,writable:!0,value:i}):e[t]=i}for(var pe=new Array(256),ue=new Array(256),he=0;he<256;he++)pe[he]=ce(he)?1:0,ue[he]=ce(he);function ge(e,t){this.input=e,this.filename=t.filename||null,this.schema=t.schema||H,this.onWarning=t.onWarning||null,this.legacy=t.legacy||!1,this.json=t.json||!1,this.listener=t.listener||null,this.implicitTypes=this.schema.compiledImplicit,this.typeMap=this.schema.compiledTypeMap,this.length=e.length,this.position=0,this.line=0,this.lineStart=0,this.lineIndent=0,this.firstTabInLine=-1,this.documents=[]}function _e(e,t){var i={name:e.filename,buffer:e.input.slice(0,-1),position:e.position,line:e.line,column:e.position-e.lineStart};return i.snippet=function(e,t){if(t=Object.create(t||null),!e.buffer)return null;t.maxLength||(t.maxLength=79),"number"!=typeof t.indent&&(t.indent=1),"number"!=typeof t.linesBefore&&(t.linesBefore=3),"number"!=typeof t.linesAfter&&(t.linesAfter=2);for(var i,n=/\r?\n|\r|\0/g,o=[0],r=[],a=-1;i=n.exec(e.buffer);)r.push(i.index),o.push(i.index+i[0].length),e.position<=i.index&&a<0&&(a=o.length-2);a<0&&(a=o.length-1);var c,l,d="",h=Math.min(e.line+t.linesAfter,r.length).toString().length,g=t.maxLength-(t.indent+h+3);for(c=1;c<=t.linesBefore&&!(a-c<0);c++)l=p(e.buffer,o[a-c],r[a-c],e.position-(o[a]-o[a-c]),g),d=s.repeat(" ",t.indent)+u((e.line-c+1).toString(),h)+" | "+l.str+"\n"+d;for(l=p(e.buffer,o[a],r[a],e.position,g),d+=s.repeat(" ",t.indent)+u((e.line+1).toString(),h)+" | "+l.str+"\n",d+=s.repeat("-",t.indent+h+3+l.pos)+"^\n",c=1;c<=t.linesAfter&&!(a+c>=r.length);c++)l=p(e.buffer,o[a+c],r[a+c],e.position-(o[a]-o[a+c]),g),d+=s.repeat(" ",t.indent)+u((e.line+c+1).toString(),h)+" | "+l.str+"\n";return d.replace(/\n$/,"")}(i),new d(t,i)}function me(e,t){throw _e(e,t)}function fe(e,t){e.onWarning&&e.onWarning.call(null,_e(e,t))}var ye={YAML:function(e,t,i){var n,o,r;null!==e.version&&me(e,"duplication of %YAML directive"),1!==i.length&&me(e,"YAML directive accepts exactly one argument"),null===(n=/^([0-9]+)\.([0-9]+)$/.exec(i[0]))&&me(e,"ill-formed argument of the YAML directive"),o=parseInt(n[1],10),r=parseInt(n[2],10),1!==o&&me(e,"unacceptable YAML version of the document"),e.version=i[0],e.checkLineBreaks=r<2,1!==r&&2!==r&&fe(e,"unsupported YAML version of the document")},TAG:function(e,t,i){var n,o;2!==i.length&&me(e,"TAG directive accepts exactly two arguments"),n=i[0],o=i[1],J.test(n)||me(e,"ill-formed tag handle (first argument) of the TAG directive"),K.call(e.tagMap,n)&&me(e,'there is a previously declared suffix for "'+n+'" tag handle'),X.test(o)||me(e,"ill-formed tag prefix (second argument) of the TAG directive");try{o=decodeURIComponent(o)}catch(t){me(e,"tag prefix is malformed: "+o)}e.tagMap[n]=o}};function ve(e,t,i,n){var o,r,a,s;if(t<i){if(s=e.input.slice(t,i),n)for(o=0,r=s.length;o<r;o+=1)9===(a=s.charCodeAt(o))||32<=a&&a<=1114111||me(e,"expected valid JSON character");else G.test(s)&&me(e,"the stream contains non-printable characters");e.result+=s}}function be(e,t,i,n){var o,r,a,c;for(s.isObject(i)||me(e,"cannot merge mappings; the provided source object is unacceptable"),a=0,c=(o=Object.keys(i)).length;a<c;a+=1)r=o[a],K.call(t,r)||(de(t,r,i[r]),n[r]=!0)}function xe(e,t,i,n,o,r,a,s,c){var l,d;if(Array.isArray(o))for(l=0,d=(o=Array.prototype.slice.call(o)).length;l<d;l+=1)Array.isArray(o[l])&&me(e,"nested arrays are not supported inside keys"),"object"==typeof o&&"[object Object]"===ee(o[l])&&(o[l]="[object Object]");if("object"==typeof o&&"[object Object]"===ee(o)&&(o="[object Object]"),o=String(o),null===t&&(t={}),"tag:yaml.org,2002:merge"===n)if(Array.isArray(r))for(l=0,d=r.length;l<d;l+=1)be(e,t,r[l],i);else be(e,t,r,i);else e.json||K.call(i,o)||!K.call(t,o)||(e.line=a||e.line,e.lineStart=s||e.lineStart,e.position=c||e.position,me(e,"duplicated mapping key")),de(t,o,r),delete i[o];return t}function we(e){var t;10===(t=e.input.charCodeAt(e.position))?e.position++:13===t?(e.position++,10===e.input.charCodeAt(e.position)&&e.position++):me(e,"a line break is expected"),e.line+=1,e.lineStart=e.position,e.firstTabInLine=-1}function $e(e,t,i){for(var n=0,o=e.input.charCodeAt(e.position);0!==o;){for(;ie(o);)9===o&&-1===e.firstTabInLine&&(e.firstTabInLine=e.position),o=e.input.charCodeAt(++e.position);if(t&&35===o)do{o=e.input.charCodeAt(++e.position)}while(10!==o&&13!==o&&0!==o);if(!te(o))break;for(we(e),o=e.input.charCodeAt(e.position),n++,e.lineIndent=0;32===o;)e.lineIndent++,o=e.input.charCodeAt(++e.position)}return-1!==i&&0!==n&&e.lineIndent<i&&fe(e,"deficient indentation"),n}function Ce(e){var t,i=e.position;return!(45!==(t=e.input.charCodeAt(i))&&46!==t||t!==e.input.charCodeAt(i+1)||t!==e.input.charCodeAt(i+2)||(i+=3,0!==(t=e.input.charCodeAt(i))&&!ne(t)))}function ke(e,t){1===t?e.result+=" ":t>1&&(e.result+=s.repeat("\n",t-1))}function Se(e,t){var i,n,o=e.tag,r=e.anchor,a=[],s=!1;if(-1!==e.firstTabInLine)return!1;for(null!==e.anchor&&(e.anchorMap[e.anchor]=a),n=e.input.charCodeAt(e.position);0!==n&&(-1!==e.firstTabInLine&&(e.position=e.firstTabInLine,me(e,"tab characters must not be used in indentation")),45===n)&&ne(e.input.charCodeAt(e.position+1));)if(s=!0,e.position++,$e(e,!0,-1)&&e.lineIndent<=t)a.push(null),n=e.input.charCodeAt(e.position);else if(i=e.line,Ee(e,t,3,!1,!0),a.push(e.result),$e(e,!0,-1),n=e.input.charCodeAt(e.position),(e.line===i||e.lineIndent>t)&&0!==n)me(e,"bad indentation of a sequence entry");else if(e.lineIndent<t)break;return!!s&&(e.tag=o,e.anchor=r,e.kind="sequence",e.result=a,!0)}function Ae(e){var t,i,n,o,r=!1,a=!1;if(33!==(o=e.input.charCodeAt(e.position)))return!1;if(null!==e.tag&&me(e,"duplication of a tag property"),60===(o=e.input.charCodeAt(++e.position))?(r=!0,o=e.input.charCodeAt(++e.position)):33===o?(a=!0,i="!!",o=e.input.charCodeAt(++e.position)):i="!",t=e.position,r){do{o=e.input.charCodeAt(++e.position)}while(0!==o&&62!==o);e.position<e.length?(n=e.input.slice(t,e.position),o=e.input.charCodeAt(++e.position)):me(e,"unexpected end of the stream within a verbatim tag")}else{for(;0!==o&&!ne(o);)33===o&&(a?me(e,"tag suffix cannot contain exclamation marks"):(i=e.input.slice(t-1,e.position+1),J.test(i)||me(e,"named tag handle cannot contain such characters"),a=!0,t=e.position+1)),o=e.input.charCodeAt(++e.position);n=e.input.slice(t,e.position),Q.test(n)&&me(e,"tag suffix cannot contain flow indicator characters")}n&&!X.test(n)&&me(e,"tag name cannot contain such characters: "+n);try{n=decodeURIComponent(n)}catch(t){me(e,"tag name is malformed: "+n)}return r?e.tag=n:K.call(e.tagMap,i)?e.tag=e.tagMap[i]+n:"!"===i?e.tag="!"+n:"!!"===i?e.tag="tag:yaml.org,2002:"+n:me(e,'undeclared tag handle "'+i+'"'),!0}function ze(e){var t,i;if(38!==(i=e.input.charCodeAt(e.position)))return!1;for(null!==e.anchor&&me(e,"duplication of an anchor property"),i=e.input.charCodeAt(++e.position),t=e.position;0!==i&&!ne(i)&&!oe(i);)i=e.input.charCodeAt(++e.position);return e.position===t&&me(e,"name of an anchor node must contain at least one character"),e.anchor=e.input.slice(t,e.position),!0}function Ee(e,t,i,n,o){var r,a,c,l,d,p,u,h,g,_=1,m=!1,f=!1;if(null!==e.listener&&e.listener("open",e),e.tag=null,e.anchor=null,e.kind=null,e.result=null,r=a=c=4===i||3===i,n&&$e(e,!0,-1)&&(m=!0,e.lineIndent>t?_=1:e.lineIndent===t?_=0:e.lineIndent<t&&(_=-1)),1===_)for(;Ae(e)||ze(e);)$e(e,!0,-1)?(m=!0,c=r,e.lineIndent>t?_=1:e.lineIndent===t?_=0:e.lineIndent<t&&(_=-1)):c=!1;if(c&&(c=m||o),1!==_&&4!==i||(h=1===i||2===i?t:t+1,g=e.position-e.lineStart,1===_?c&&(Se(e,g)||function(e,t,i){var n,o,r,a,s,c,l,d=e.tag,p=e.anchor,u={},h=Object.create(null),g=null,_=null,m=null,f=!1,y=!1;if(-1!==e.firstTabInLine)return!1;for(null!==e.anchor&&(e.anchorMap[e.anchor]=u),l=e.input.charCodeAt(e.position);0!==l;){if(f||-1===e.firstTabInLine||(e.position=e.firstTabInLine,me(e,"tab characters must not be used in indentation")),n=e.input.charCodeAt(e.position+1),r=e.line,63!==l&&58!==l||!ne(n)){if(a=e.line,s=e.lineStart,c=e.position,!Ee(e,i,2,!1,!0))break;if(e.line===r){for(l=e.input.charCodeAt(e.position);ie(l);)l=e.input.charCodeAt(++e.position);if(58===l)ne(l=e.input.charCodeAt(++e.position))||me(e,"a whitespace character is expected after the key-value separator within a block mapping"),f&&(xe(e,u,h,g,_,null,a,s,c),g=_=m=null),y=!0,f=!1,o=!1,g=e.tag,_=e.result;else{if(!y)return e.tag=d,e.anchor=p,!0;me(e,"can not read an implicit mapping pair; a colon is missed")}}else{if(!y)return e.tag=d,e.anchor=p,!0;me(e,"can not read a block mapping entry; a multiline key may not be an implicit key")}}else 63===l?(f&&(xe(e,u,h,g,_,null,a,s,c),g=_=m=null),y=!0,f=!0,o=!0):f?(f=!1,o=!0):me(e,"incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"),e.position+=1,l=n;if((e.line===r||e.lineIndent>t)&&(f&&(a=e.line,s=e.lineStart,c=e.position),Ee(e,t,4,!0,o)&&(f?_=e.result:m=e.result),f||(xe(e,u,h,g,_,m,a,s,c),g=_=m=null),$e(e,!0,-1),l=e.input.charCodeAt(e.position)),(e.line===r||e.lineIndent>t)&&0!==l)me(e,"bad indentation of a mapping entry");else if(e.lineIndent<t)break}return f&&xe(e,u,h,g,_,null,a,s,c),y&&(e.tag=d,e.anchor=p,e.kind="mapping",e.result=u),y}(e,g,h))||function(e,t){var i,n,o,r,a,s,c,l,d,p,u,h,g=!0,_=e.tag,m=e.anchor,f=Object.create(null);if(91===(h=e.input.charCodeAt(e.position)))a=93,l=!1,r=[];else{if(123!==h)return!1;a=125,l=!0,r={}}for(null!==e.anchor&&(e.anchorMap[e.anchor]=r),h=e.input.charCodeAt(++e.position);0!==h;){if($e(e,!0,t),(h=e.input.charCodeAt(e.position))===a)return e.position++,e.tag=_,e.anchor=m,e.kind=l?"mapping":"sequence",e.result=r,!0;g?44===h&&me(e,"expected the node content, but found ','"):me(e,"missed comma between flow collection entries"),u=null,s=c=!1,63===h&&ne(e.input.charCodeAt(e.position+1))&&(s=c=!0,e.position++,$e(e,!0,t)),i=e.line,n=e.lineStart,o=e.position,Ee(e,t,1,!1,!0),p=e.tag,d=e.result,$e(e,!0,t),h=e.input.charCodeAt(e.position),!c&&e.line!==i||58!==h||(s=!0,h=e.input.charCodeAt(++e.position),$e(e,!0,t),Ee(e,t,1,!1,!0),u=e.result),l?xe(e,r,f,p,d,u,i,n,o):s?r.push(xe(e,null,f,p,d,u,i,n,o)):r.push(d),$e(e,!0,t),44===(h=e.input.charCodeAt(e.position))?(g=!0,h=e.input.charCodeAt(++e.position)):g=!1}me(e,"unexpected end of the stream within a flow collection")}(e,h)?f=!0:(a&&function(e,t){var i,n,o,r,a=1,c=!1,l=!1,d=t,p=0,u=!1;if(124===(r=e.input.charCodeAt(e.position)))n=!1;else{if(62!==r)return!1;n=!0}for(e.kind="scalar",e.result="";0!==r;)if(43===(r=e.input.charCodeAt(++e.position))||45===r)1===a?a=43===r?3:2:me(e,"repeat of a chomping mode identifier");else{if(!((o=se(r))>=0))break;0===o?me(e,"bad explicit indentation width of a block scalar; it cannot be less than one"):l?me(e,"repeat of an indentation width identifier"):(d=t+o-1,l=!0)}if(ie(r)){do{r=e.input.charCodeAt(++e.position)}while(ie(r));if(35===r)do{r=e.input.charCodeAt(++e.position)}while(!te(r)&&0!==r)}for(;0!==r;){for(we(e),e.lineIndent=0,r=e.input.charCodeAt(e.position);(!l||e.lineIndent<d)&&32===r;)e.lineIndent++,r=e.input.charCodeAt(++e.position);if(!l&&e.lineIndent>d&&(d=e.lineIndent),te(r))p++;else{if(e.lineIndent<d){3===a?e.result+=s.repeat("\n",c?1+p:p):1===a&&c&&(e.result+="\n");break}for(n?ie(r)?(u=!0,e.result+=s.repeat("\n",c?1+p:p)):u?(u=!1,e.result+=s.repeat("\n",p+1)):0===p?c&&(e.result+=" "):e.result+=s.repeat("\n",p):e.result+=s.repeat("\n",c?1+p:p),c=!0,l=!0,p=0,i=e.position;!te(r)&&0!==r;)r=e.input.charCodeAt(++e.position);ve(e,i,e.position,!1)}}return!0}(e,h)||function(e,t){var i,n,o;if(39!==(i=e.input.charCodeAt(e.position)))return!1;for(e.kind="scalar",e.result="",e.position++,n=o=e.position;0!==(i=e.input.charCodeAt(e.position));)if(39===i){if(ve(e,n,e.position,!0),39!==(i=e.input.charCodeAt(++e.position)))return!0;n=e.position,e.position++,o=e.position}else te(i)?(ve(e,n,o,!0),ke(e,$e(e,!1,t)),n=o=e.position):e.position===e.lineStart&&Ce(e)?me(e,"unexpected end of the document within a single quoted scalar"):(e.position++,o=e.position);me(e,"unexpected end of the stream within a single quoted scalar")}(e,h)||function(e,t){var i,n,o,r,a,s;if(34!==(s=e.input.charCodeAt(e.position)))return!1;for(e.kind="scalar",e.result="",e.position++,i=n=e.position;0!==(s=e.input.charCodeAt(e.position));){if(34===s)return ve(e,i,e.position,!0),e.position++,!0;if(92===s){if(ve(e,i,e.position,!0),te(s=e.input.charCodeAt(++e.position)))$e(e,!1,t);else if(s<256&&pe[s])e.result+=ue[s],e.position++;else if((a=ae(s))>0){for(o=a,r=0;o>0;o--)(a=re(s=e.input.charCodeAt(++e.position)))>=0?r=(r<<4)+a:me(e,"expected hexadecimal character");e.result+=le(r),e.position++}else me(e,"unknown escape sequence");i=n=e.position}else te(s)?(ve(e,i,n,!0),ke(e,$e(e,!1,t)),i=n=e.position):e.position===e.lineStart&&Ce(e)?me(e,"unexpected end of the document within a double quoted scalar"):(e.position++,n=e.position)}me(e,"unexpected end of the stream within a double quoted scalar")}(e,h)?f=!0:function(e){var t,i,n;if(42!==(n=e.input.charCodeAt(e.position)))return!1;for(n=e.input.charCodeAt(++e.position),t=e.position;0!==n&&!ne(n)&&!oe(n);)n=e.input.charCodeAt(++e.position);return e.position===t&&me(e,"name of an alias node must contain at least one character"),i=e.input.slice(t,e.position),K.call(e.anchorMap,i)||me(e,'unidentified alias "'+i+'"'),e.result=e.anchorMap[i],$e(e,!0,-1),!0}(e)?(f=!0,null===e.tag&&null===e.anchor||me(e,"alias node should not have any properties")):function(e,t,i){var n,o,r,a,s,c,l,d,p=e.kind,u=e.result;if(ne(d=e.input.charCodeAt(e.position))||oe(d)||35===d||38===d||42===d||33===d||124===d||62===d||39===d||34===d||37===d||64===d||96===d)return!1;if((63===d||45===d)&&(ne(n=e.input.charCodeAt(e.position+1))||i&&oe(n)))return!1;for(e.kind="scalar",e.result="",o=r=e.position,a=!1;0!==d;){if(58===d){if(ne(n=e.input.charCodeAt(e.position+1))||i&&oe(n))break}else if(35===d){if(ne(e.input.charCodeAt(e.position-1)))break}else{if(e.position===e.lineStart&&Ce(e)||i&&oe(d))break;if(te(d)){if(s=e.line,c=e.lineStart,l=e.lineIndent,$e(e,!1,-1),e.lineIndent>=t){a=!0,d=e.input.charCodeAt(e.position);continue}e.position=r,e.line=s,e.lineStart=c,e.lineIndent=l;break}}a&&(ve(e,o,r,!1),ke(e,e.line-s),o=r=e.position,a=!1),ie(d)||(r=e.position+1),d=e.input.charCodeAt(++e.position)}return ve(e,o,r,!1),!!e.result||(e.kind=p,e.result=u,!1)}(e,h,1===i)&&(f=!0,null===e.tag&&(e.tag="?")),null!==e.anchor&&(e.anchorMap[e.anchor]=e.result)):0===_&&(f=c&&Se(e,g))),null===e.tag)null!==e.anchor&&(e.anchorMap[e.anchor]=e.result);else if("?"===e.tag){for(null!==e.result&&"scalar"!==e.kind&&me(e,'unacceptable node kind for !<?> tag; it should be "scalar", not "'+e.kind+'"'),l=0,d=e.implicitTypes.length;l<d;l+=1)if((u=e.implicitTypes[l]).resolve(e.result)){e.result=u.construct(e.result),e.tag=u.tag,null!==e.anchor&&(e.anchorMap[e.anchor]=e.result);break}}else if("!"!==e.tag){if(K.call(e.typeMap[e.kind||"fallback"],e.tag))u=e.typeMap[e.kind||"fallback"][e.tag];else for(u=null,l=0,d=(p=e.typeMap.multi[e.kind||"fallback"]).length;l<d;l+=1)if(e.tag.slice(0,p[l].tag.length)===p[l].tag){u=p[l];break}u||me(e,"unknown tag !<"+e.tag+">"),null!==e.result&&u.kind!==e.kind&&me(e,"unacceptable node kind for !<"+e.tag+'> tag; it should be "'+u.kind+'", not "'+e.kind+'"'),u.resolve(e.result,e.tag)?(e.result=u.construct(e.result,e.tag),null!==e.anchor&&(e.anchorMap[e.anchor]=e.result)):me(e,"cannot resolve a node with !<"+e.tag+"> explicit tag")}return null!==e.listener&&e.listener("close",e),null!==e.tag||null!==e.anchor||f}function Oe(e){var t,i,n,o,r=e.position,a=!1;for(e.version=null,e.checkLineBreaks=e.legacy,e.tagMap=Object.create(null),e.anchorMap=Object.create(null);0!==(o=e.input.charCodeAt(e.position))&&($e(e,!0,-1),o=e.input.charCodeAt(e.position),!(e.lineIndent>0||37!==o));){for(a=!0,o=e.input.charCodeAt(++e.position),t=e.position;0!==o&&!ne(o);)o=e.input.charCodeAt(++e.position);for(n=[],(i=e.input.slice(t,e.position)).length<1&&me(e,"directive name must not be less than one character in length");0!==o;){for(;ie(o);)o=e.input.charCodeAt(++e.position);if(35===o){do{o=e.input.charCodeAt(++e.position)}while(0!==o&&!te(o));break}if(te(o))break;for(t=e.position;0!==o&&!ne(o);)o=e.input.charCodeAt(++e.position);n.push(e.input.slice(t,e.position))}0!==o&&we(e),K.call(ye,i)?ye[i](e,i,n):fe(e,'unknown document directive "'+i+'"')}$e(e,!0,-1),0===e.lineIndent&&45===e.input.charCodeAt(e.position)&&45===e.input.charCodeAt(e.position+1)&&45===e.input.charCodeAt(e.position+2)?(e.position+=3,$e(e,!0,-1)):a&&me(e,"directives end mark is expected"),Ee(e,e.lineIndent-1,4,!1,!0),$e(e,!0,-1),e.checkLineBreaks&&Z.test(e.input.slice(r,e.position))&&fe(e,"non-ASCII line breaks are interpreted as content"),e.documents.push(e.result),e.position===e.lineStart&&Ce(e)?46===e.input.charCodeAt(e.position)&&(e.position+=3,$e(e,!0,-1)):e.position<e.length-1&&me(e,"end of the stream or a document separator is expected")}function qe(e,t){t=t||{},0!==(e=String(e)).length&&(10!==e.charCodeAt(e.length-1)&&13!==e.charCodeAt(e.length-1)&&(e+="\n"),65279===e.charCodeAt(0)&&(e=e.slice(1)));var i=new ge(e,t),n=e.indexOf("\0");for(-1!==n&&(i.position=n,me(i,"null byte is not allowed in input")),i.input+="\0";32===i.input.charCodeAt(i.position);)i.lineIndent+=1,i.position+=1;for(;i.position<i.length-1;)Oe(i);return i.documents}var je={loadAll:function(e,t,i){null!==t&&"object"==typeof t&&void 0===i&&(i=t,t=null);var n=qe(e,i);if("function"!=typeof t)return n;for(var o=0,r=n.length;o<r;o+=1)t(n[o])},load:function(e,t){var i=qe(e,t);if(0!==i.length){if(1===i.length)return i[0];throw new d("expected a single document in the stream, but found more")}}},Te=Object.prototype.toString,De=Object.prototype.hasOwnProperty,Fe=65279,Ie={0:"\\0",7:"\\a",8:"\\b",9:"\\t",10:"\\n",11:"\\v",12:"\\f",13:"\\r",27:"\\e",34:'\\"',92:"\\\\",133:"\\N",160:"\\_",8232:"\\L",8233:"\\P"},Le=["y","Y","yes","Yes","YES","on","On","ON","n","N","no","No","NO","off","Off","OFF"],Me=/^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;function Pe(e){var t,i,n;if(t=e.toString(16).toUpperCase(),e<=255)i="x",n=2;else if(e<=65535)i="u",n=4;else{if(!(e<=4294967295))throw new d("code point within a string may not be greater than 0xFFFFFFFF");i="U",n=8}return"\\"+i+s.repeat("0",n-t.length)+t}function Ne(e){this.schema=e.schema||H,this.indent=Math.max(1,e.indent||2),this.noArrayIndent=e.noArrayIndent||!1,this.skipInvalid=e.skipInvalid||!1,this.flowLevel=s.isNothing(e.flowLevel)?-1:e.flowLevel,this.styleMap=function(e,t){var i,n,o,r,a,s,c;if(null===t)return{};for(i={},o=0,r=(n=Object.keys(t)).length;o<r;o+=1)a=n[o],s=String(t[a]),"!!"===a.slice(0,2)&&(a="tag:yaml.org,2002:"+a.slice(2)),(c=e.compiledTypeMap.fallback[a])&&De.call(c.styleAliases,s)&&(s=c.styleAliases[s]),i[a]=s;return i}(this.schema,e.styles||null),this.sortKeys=e.sortKeys||!1,this.lineWidth=e.lineWidth||80,this.noRefs=e.noRefs||!1,this.noCompatMode=e.noCompatMode||!1,this.condenseFlow=e.condenseFlow||!1,this.quotingType='"'===e.quotingType?2:1,this.forceQuotes=e.forceQuotes||!1,this.replacer="function"==typeof e.replacer?e.replacer:null,this.implicitTypes=this.schema.compiledImplicit,this.explicitTypes=this.schema.compiledExplicit,this.tag=null,this.result="",this.duplicates=[],this.usedDuplicates=null}function Ue(e,t){for(var i,n=s.repeat(" ",t),o=0,r=-1,a="",c=e.length;o<c;)-1===(r=e.indexOf("\n",o))?(i=e.slice(o),o=c):(i=e.slice(o,r+1),o=r+1),i.length&&"\n"!==i&&(a+=n),a+=i;return a}function Re(e,t){return"\n"+s.repeat(" ",e.indent*t)}function Ye(e){return 32===e||9===e}function Ve(e){return 32<=e&&e<=126||161<=e&&e<=55295&&8232!==e&&8233!==e||57344<=e&&e<=65533&&e!==Fe||65536<=e&&e<=1114111}function We(e){return Ve(e)&&e!==Fe&&13!==e&&10!==e}function Be(e,t,i){var n=We(e),o=n&&!Ye(e);return(i?n:n&&44!==e&&91!==e&&93!==e&&123!==e&&125!==e)&&35!==e&&!(58===t&&!o)||We(t)&&!Ye(t)&&35===e||58===t&&o}function He(e,t){var i,n=e.charCodeAt(t);return n>=55296&&n<=56319&&t+1<e.length&&(i=e.charCodeAt(t+1))>=56320&&i<=57343?1024*(n-55296)+i-56320+65536:n}function Ke(e){return/^\n* /.test(e)}function Ge(e,t,i,n,o){e.dump=function(){if(0===t.length)return 2===e.quotingType?'""':"''";if(!e.noCompatMode&&(-1!==Le.indexOf(t)||Me.test(t)))return 2===e.quotingType?'"'+t+'"':"'"+t+"'";var r=e.indent*Math.max(1,i),a=-1===e.lineWidth?-1:Math.max(Math.min(e.lineWidth,40),e.lineWidth-r),s=n||e.flowLevel>-1&&i>=e.flowLevel;switch(function(e,t,i,n,o,r,a,s){var c,l,d=0,p=null,u=!1,h=!1,g=-1!==n,_=-1,m=Ve(l=He(e,0))&&l!==Fe&&!Ye(l)&&45!==l&&63!==l&&58!==l&&44!==l&&91!==l&&93!==l&&123!==l&&125!==l&&35!==l&&38!==l&&42!==l&&33!==l&&124!==l&&61!==l&&62!==l&&39!==l&&34!==l&&37!==l&&64!==l&&96!==l&&function(e){return!Ye(e)&&58!==e}(He(e,e.length-1));if(t||a)for(c=0;c<e.length;d>=65536?c+=2:c++){if(!Ve(d=He(e,c)))return 5;m=m&&Be(d,p,s),p=d}else{for(c=0;c<e.length;d>=65536?c+=2:c++){if(10===(d=He(e,c)))u=!0,g&&(h=h||c-_-1>n&&" "!==e[_+1],_=c);else if(!Ve(d))return 5;m=m&&Be(d,p,s),p=d}h=h||g&&c-_-1>n&&" "!==e[_+1]}return u||h?i>9&&Ke(e)?5:a?2===r?5:2:h?4:3:!m||a||o(e)?2===r?5:2:1}(t,s,e.indent,a,function(t){return function(e,t){var i,n;for(i=0,n=e.implicitTypes.length;i<n;i+=1)if(e.implicitTypes[i].resolve(t))return!0;return!1}(e,t)},e.quotingType,e.forceQuotes&&!n,o)){case 1:return t;case 2:return"'"+t.replace(/'/g,"''")+"'";case 3:return"|"+Ze(t,e.indent)+Qe(Ue(t,r));case 4:return">"+Ze(t,e.indent)+Qe(Ue(function(e,t){for(var i,n,o,r=/(\n+)([^\n]*)/g,a=(o=-1!==(o=e.indexOf("\n"))?o:e.length,r.lastIndex=o,Je(e.slice(0,o),t)),s="\n"===e[0]||" "===e[0];n=r.exec(e);){var c=n[1],l=n[2];i=" "===l[0],a+=c+(s||i||""===l?"":"\n")+Je(l,t),s=i}return a}(t,a),r));case 5:return'"'+function(e){for(var t,i="",n=0,o=0;o<e.length;n>=65536?o+=2:o++)n=He(e,o),!(t=Ie[n])&&Ve(n)?(i+=e[o],n>=65536&&(i+=e[o+1])):i+=t||Pe(n);return i}(t)+'"';default:throw new d("impossible error: invalid scalar style")}}()}function Ze(e,t){var i=Ke(e)?String(t):"",n="\n"===e[e.length-1];return i+(!n||"\n"!==e[e.length-2]&&"\n"!==e?n?"":"-":"+")+"\n"}function Qe(e){return"\n"===e[e.length-1]?e.slice(0,-1):e}function Je(e,t){if(""===e||" "===e[0])return e;for(var i,n,o=/ [^ ]/g,r=0,a=0,s=0,c="";i=o.exec(e);)(s=i.index)-r>t&&(n=a>r?a:s,c+="\n"+e.slice(r,n),r=n+1),a=s;return c+="\n",e.length-r>t&&a>r?c+=e.slice(r,a)+"\n"+e.slice(a+1):c+=e.slice(r),c.slice(1)}function Xe(e,t,i,n){var o,r,a,s="",c=e.tag;for(o=0,r=i.length;o<r;o+=1)a=i[o],e.replacer&&(a=e.replacer.call(i,String(o),a)),(tt(e,t+1,a,!0,!0,!1,!0)||void 0===a&&tt(e,t+1,null,!0,!0,!1,!0))&&(n&&""===s||(s+=Re(e,t)),e.dump&&10===e.dump.charCodeAt(0)?s+="-":s+="- ",s+=e.dump);e.tag=c,e.dump=s||"[]"}function et(e,t,i){var n,o,r,a,s,c;for(r=0,a=(o=i?e.explicitTypes:e.implicitTypes).length;r<a;r+=1)if(((s=o[r]).instanceOf||s.predicate)&&(!s.instanceOf||"object"==typeof t&&t instanceof s.instanceOf)&&(!s.predicate||s.predicate(t))){if(i?s.multi&&s.representName?e.tag=s.representName(t):e.tag=s.tag:e.tag="?",s.represent){if(c=e.styleMap[s.tag]||s.defaultStyle,"[object Function]"===Te.call(s.represent))n=s.represent(t,c);else{if(!De.call(s.represent,c))throw new d("!<"+s.tag+'> tag resolver accepts not "'+c+'" style');n=s.represent[c](t,c)}e.dump=n}return!0}return!1}function tt(e,t,i,n,o,r,a){e.tag=null,e.dump=i,et(e,i,!1)||et(e,i,!0);var s,c=Te.call(e.dump),l=n;n&&(n=e.flowLevel<0||e.flowLevel>t);var p,u,h="[object Object]"===c||"[object Array]"===c;if(h&&(u=-1!==(p=e.duplicates.indexOf(i))),(null!==e.tag&&"?"!==e.tag||u||2!==e.indent&&t>0)&&(o=!1),u&&e.usedDuplicates[p])e.dump="*ref_"+p;else{if(h&&u&&!e.usedDuplicates[p]&&(e.usedDuplicates[p]=!0),"[object Object]"===c)n&&0!==Object.keys(e.dump).length?(function(e,t,i,n){var o,r,a,s,c,l,p="",u=e.tag,h=Object.keys(i);if(!0===e.sortKeys)h.sort();else if("function"==typeof e.sortKeys)h.sort(e.sortKeys);else if(e.sortKeys)throw new d("sortKeys must be a boolean or a function");for(o=0,r=h.length;o<r;o+=1)l="",n&&""===p||(l+=Re(e,t)),s=i[a=h[o]],e.replacer&&(s=e.replacer.call(i,a,s)),tt(e,t+1,a,!0,!0,!0)&&((c=null!==e.tag&&"?"!==e.tag||e.dump&&e.dump.length>1024)&&(e.dump&&10===e.dump.charCodeAt(0)?l+="?":l+="? "),l+=e.dump,c&&(l+=Re(e,t)),tt(e,t+1,s,!0,c)&&(e.dump&&10===e.dump.charCodeAt(0)?l+=":":l+=": ",p+=l+=e.dump));e.tag=u,e.dump=p||"{}"}(e,t,e.dump,o),u&&(e.dump="&ref_"+p+e.dump)):(function(e,t,i){var n,o,r,a,s,c="",l=e.tag,d=Object.keys(i);for(n=0,o=d.length;n<o;n+=1)s="",""!==c&&(s+=", "),e.condenseFlow&&(s+='"'),a=i[r=d[n]],e.replacer&&(a=e.replacer.call(i,r,a)),tt(e,t,r,!1,!1)&&(e.dump.length>1024&&(s+="? "),s+=e.dump+(e.condenseFlow?'"':"")+":"+(e.condenseFlow?"":" "),tt(e,t,a,!1,!1)&&(c+=s+=e.dump));e.tag=l,e.dump="{"+c+"}"}(e,t,e.dump),u&&(e.dump="&ref_"+p+" "+e.dump));else if("[object Array]"===c)n&&0!==e.dump.length?(e.noArrayIndent&&!a&&t>0?Xe(e,t-1,e.dump,o):Xe(e,t,e.dump,o),u&&(e.dump="&ref_"+p+e.dump)):(function(e,t,i){var n,o,r,a="",s=e.tag;for(n=0,o=i.length;n<o;n+=1)r=i[n],e.replacer&&(r=e.replacer.call(i,String(n),r)),(tt(e,t,r,!1,!1)||void 0===r&&tt(e,t,null,!1,!1))&&(""!==a&&(a+=","+(e.condenseFlow?"":" ")),a+=e.dump);e.tag=s,e.dump="["+a+"]"}(e,t,e.dump),u&&(e.dump="&ref_"+p+" "+e.dump));else{if("[object String]"!==c){if("[object Undefined]"===c)return!1;if(e.skipInvalid)return!1;throw new d("unacceptable kind of an object to dump "+c)}"?"!==e.tag&&Ge(e,e.dump,t,r,l)}null!==e.tag&&"?"!==e.tag&&(s=encodeURI("!"===e.tag[0]?e.tag.slice(1):e.tag).replace(/!/g,"%21"),s="!"===e.tag[0]?"!"+s:"tag:yaml.org,2002:"===s.slice(0,18)?"!!"+s.slice(18):"!<"+s+">",e.dump=s+" "+e.dump)}return!0}function it(e,t){var i,n,o=[],r=[];for(nt(e,o,r),i=0,n=r.length;i<n;i+=1)t.duplicates.push(o[r[i]]);t.usedDuplicates=new Array(n)}function nt(e,t,i){var n,o,r;if(null!==e&&"object"==typeof e)if(-1!==(o=t.indexOf(e)))-1===i.indexOf(o)&&i.push(o);else if(t.push(e),Array.isArray(e))for(o=0,r=e.length;o<r;o+=1)nt(e[o],t,i);else for(o=0,r=(n=Object.keys(e)).length;o<r;o+=1)nt(e[n[o]],t,i)}function ot(e,t){return function(){throw new Error("Function yaml."+e+" is removed in js-yaml 4. Use yaml."+t+" instead, which is now safe by default.")}}var rt={Type:_,Schema:y,FAILSAFE_SCHEMA:w,JSON_SCHEMA:j,CORE_SCHEMA:T,DEFAULT_SCHEMA:H,load:je.load,loadAll:je.loadAll,dump:function(e,t){var i=new Ne(t=t||{});i.noRefs||it(e,i);var n=e;return i.replacer&&(n=i.replacer.call({"":n},"",n)),tt(i,0,n,!0,!0)?i.dump+"\n":""},YAMLException:d,types:{binary:P,float:q,map:x,null:$,pairs:V,set:B,timestamp:I,bool:C,int:z,merge:L,omap:R,seq:b,str:v},safeLoad:ot("safeLoad","load"),safeLoadAll:ot("safeLoadAll","loadAll"),safeDump:ot("safeDump","dump")},at=i(217),st=i(475),ct=i(113);const lt=[{name:"show_summary_views",selector:{boolean:{}}},{name:"show_room_views",selector:{boolean:{}}}];const dt=[{name:"summaries_columns",selector:{select:{mode:"box",options:[{value:2,label:(0,st.localize)("editor.columns_2")},{value:4,label:(0,st.localize)("editor.columns_4")}]}}},{name:"show_light_summary",selector:{boolean:{}}},{name:"group_lights_by_floors",selector:{boolean:{}}},{name:"nested_light_groups",selector:{boolean:{}}},{name:"lights_sort_by",selector:{select:{mode:"list",options:[{value:"last_changed",label:(0,st.localize)("editor.lights_sort_by_last_changed")},{value:"name",label:(0,st.localize)("editor.lights_sort_by_name")}]}}},{name:"show_covers_summary",selector:{boolean:{}}},{name:"show_partially_open_covers",selector:{boolean:{}}},{name:"group_covers_by_floors",selector:{boolean:{}}},{name:"show_security_summary",selector:{boolean:{}}},{name:"show_climate_summary",selector:{boolean:{}}},{name:"show_battery_summary",selector:{boolean:{}}},{name:"hide_mobile_app_batteries",selector:{boolean:{}}},{name:"show_area_in_battery_view",selector:{boolean:{}}},{name:"hide_battery_notes_entities",selector:{boolean:{}}},{name:"battery_critical_threshold",selector:{number:{min:1,max:99,step:1,unit_of_measurement:"%",mode:"box"}}},{name:"battery_low_threshold",selector:{number:{min:1,max:99,step:1,unit_of_measurement:"%",mode:"box"}}},{name:"unavailable_batteries_bucket",selector:{select:{mode:"list",options:[{value:"critical",label:(0,st.localize)("editor.unavailable_batteries_critical")},{value:"good",label:(0,st.localize)("editor.unavailable_batteries_good")}]}}}],pt=["overview","summaries","favorites","custom_cards","areas","areas_other","weather","energy"],ut=["show_unavailable_alert_badge","show_now_playing_badge","show_sun_badge","show_updates_badge"];function ht(e){return n.qy`
    <div class="section">
      <div class="section-title">${(0,st.localize)("editor.section_order")}</div>
      <div class="description" style="margin-left: 0; margin-bottom: 12px;">
        ${(0,st.localize)("editor.section_order_desc")}
      </div>
      <div class="section-order-list" id="section-order-list">
        ${e.order.map(t=>function(e,t){const i=e.sectionMeta.get(t);if(!i)return n.s6;const o=e.isSectionDisabled(t),r=e.isSectionToggleable(t);return n.qy`
    <div
      class="section-order-item ${o?"disabled":""}"
      data-section-key=${t}
      draggable="true"
      @dragstart=${e.onDragStart}
      @dragend=${e.onDragEnd}
      @dragover=${e.onDragOver}
      @dragleave=${e.onDragLeave}
      @drop=${e.onDrop}
    >
      <span class="drag-handle" draggable="true">&#x2630;</span>
      <ha-icon class="section-icon" icon=${i.icon}></ha-icon>
      <span class="section-label">${(0,st.localize)(i.labelKey)}</span>
      ${o&&!r?n.qy`<span class="section-hidden-tag">(${(0,st.localize)("editor.section_hidden")})</span>`:n.s6}
      ${r?n.qy`
            <label
              class="section-toggle"
              @mousedown=${e=>{e.stopPropagation()}}
            >
              <input
                type="checkbox"
                ?checked=${!o}
                @change=${i=>{e.onToggleSectionVisibility(t,i.target.checked)}}
                @dragstart=${e=>{e.stopPropagation()}}
              />
            </label>
          `:n.s6}
    </div>
    ${function(e,t){if("weather"!==t)return n.s6;if(!1===e.config.show_weather)return n.s6;const i=e.config.weather_presentation??(!1===e.config.show_weather_forecast_card?"none":"forecast_daily"),o=e.config.weather_entity||"",r=n.qy`
    <div class="section-order-sub" style="flex-wrap: wrap;">
      <label for="weather-presentation">${(0,st.localize)("editor.weather_presentation")}</label>
      <select
        id="weather-presentation"
        .value=${i}
        @change=${t=>e.onSetWeatherPresentation(t.target.value)}
      >
        ${["forecast_daily","forecast_hourly","forecast_twice_daily","tile","none"].map(e=>n.qy`
            <option value=${e} ?selected=${i===e}>
              ${(0,st.localize)(`editor.weather_presentation_${e}`)}
            </option>
          `)}
      </select>
    </div>
  `,a=e.weatherEntities.length>1?n.qy`
          <div class="section-order-sub" style="flex-wrap: wrap;">
            <label for="weather-entity">${(0,st.localize)("editor.weather_entity")}</label>
            <select
              id="weather-entity"
              .value=${o}
              @change=${e.onWeatherEntityChange}
            >
              <option value="" ?selected=${!o}>
                ${(0,st.localize)("editor.weather_entity_auto")}
              </option>
              ${e.weatherEntities.map(e=>n.qy`
                  <option
                    value=${e.entity_id}
                    ?selected=${e.entity_id===o}
                  >
                    ${e.name}
                  </option>
                `)}
            </select>
          </div>
        `:n.s6;return n.qy`${r}${a}`}(e,t)} ${function(e,t){if("energy"!==t)return n.s6;if(!1===e.config.show_energy)return n.s6;const i=!1!==e.config.energy_link_dashboard,o=!1!==e.config.show_energy_distribution_card,r=e.config.power_badge_entity||"";return n.qy`
    <div class="section-order-sub">
      <input
        type="checkbox"
        id="energy-link-dashboard"
        ?checked=${i}
        @change=${t=>e.onToggleChange("energy_link_dashboard",t.target.checked,!0)}
      />
      <label for="energy-link-dashboard">${(0,st.localize)("editor.energy_link_dashboard")}</label>
    </div>
    <div class="section-order-sub">
      <input
        type="checkbox"
        id="show-energy-distribution-card"
        ?checked=${o}
        @change=${t=>e.onToggleChange("show_energy_distribution_card",t.target.checked,!0)}
      />
      <label for="show-energy-distribution-card">
        ${(0,st.localize)("editor.show_energy_distribution_card")}
      </label>
    </div>
    ${e.powerSensorEntities.length>0?n.qy`
          <div class="section-order-sub" style="display: block;">
            <label for="power-badge-entity" style="display: block; margin-bottom: 4px;">
              ${(0,st.localize)("editor.power_badge_entity")}
            </label>
            <select
              id="power-badge-entity"
              style="width: 100%;"
              @change=${e.onPowerBadgeEntityChange}
            >
              <option value="" ?selected=${!r}>
                ${(0,st.localize)("editor.power_badge_none")}
              </option>
              ${e.powerSensorEntities.map(e=>n.qy`
                  <option
                    value=${e.entity_id}
                    ?selected=${e.entity_id===r}
                  >
                    ${e.name}
                  </option>
                `)}
            </select>
            <div class="description">${(0,st.localize)("editor.power_badge_entity_desc")}</div>
          </div>
        `:n.s6}
  `}(e,t)}
  `}(e,t))}
      </div>
      ${function(e){const t=new Set(e.config.hidden_section_headings||[]);return n.qy`
    <details style="margin-top: 12px;">
      <summary
        style="cursor: pointer; font-size: 13px; font-weight: 500; color: var(--primary-text-color); padding: 4px 0;"
      >
        ${(0,st.localize)("editor.hide_section_headings")}
      </summary>
      <div style="margin-left: 14px; margin-top: 6px;">
        <div class="description" style="margin-left: 0; margin-bottom: 8px;">
          ${(0,st.localize)("editor.hide_section_headings_desc")}
        </div>
        ${pt.map(i=>n.qy`
            <div class="form-row">
              <input
                type="checkbox"
                id="hide-heading-${i}"
                ?checked=${t.has(i)}
                @change=${t=>e.onToggleHiddenHeading(i,t.target.checked)}
              />
              <label for="hide-heading-${i}">${(0,st.localize)(`editor.heading_label_${i}`)}</label>
            </div>
          `)}
      </div>
    </details>
  `}(e)} ${function(e){return n.qy`
    ${ut.map(t=>n.qy`
        <div style="margin-top: 12px;">
          <div class="form-row">
            <input
              type="checkbox"
              id=${t}
              ?checked=${!0===e.config[t]}
              @change=${i=>e.onToggleChange(t,i.target.checked,!1)}
            />
            <label for=${t}>${(0,st.localize)(`editor.${t}`)}</label>
          </div>
          <div class="description">${(0,st.localize)(`editor.${t}_desc`)}</div>
        </div>
      `)}
  `}(e)} ${function(e){return n.qy`
    <details style="margin-top: 12px;">
      <summary
        style="cursor: pointer; font-size: 13px; font-weight: 500; color: var(--primary-text-color); padding: 4px 0;"
      >
        ${(0,st.localize)("editor.section_visibility")}
      </summary>
      <div style="margin-left: 14px; margin-top: 6px;">
        <div class="description" style="margin-left: 0; margin-bottom: 8px;">
          ${(0,st.localize)("editor.section_visibility_desc")}
        </div>
        ${e.order.map(t=>{const i=e.sectionMeta.get(t);if(!i)return n.s6;const o=e.config.section_visibility?.[t];return n.qy`
            <div
              style="border: 1px solid var(--divider-color); border-radius: 6px; padding: 8px; margin-bottom: 8px;"
            >
              <div style="font-weight: 500; margin-bottom: 6px;">${(0,st.localize)(i.labelKey)}</div>
              <div class="form-row">
                <label for="visibility-entity-${t}" style="min-width: 80px; font-size: 12px;">
                  ${(0,st.localize)("editor.section_visibility_entity")}
                </label>
                <input
                  type="text"
                  id="visibility-entity-${t}"
                  style="flex: 1;"
                  placeholder="calendar.workday_sensor"
                  .value=${o?.entity||""}
                  @change=${i=>e.onSectionVisibilityChange(t,"entity",i.target.value)}
                />
              </div>
              <div class="form-row">
                <label for="visibility-state-${t}" style="min-width: 80px; font-size: 12px;">
                  ${(0,st.localize)("editor.section_visibility_state")}
                </label>
                <input
                  type="text"
                  id="visibility-state-${t}"
                  style="flex: 1;"
                  placeholder="on"
                  .value=${o?.state||""}
                  @change=${i=>e.onSectionVisibilityChange(t,"state",i.target.value)}
                />
              </div>
            </div>
          `})}
      </div>
    </details>
  `}(e)}
    </div>
  `}var gt=i(453);const _t={layout:{label:"Layout & display",icon:"mdi:view-grid-outline"},tiles:{label:"Tiles & sections",icon:"mdi:apps"},panel:{label:"Wall panel / kiosk",icon:"mdi:tablet-dashboard"},users:{label:"Per-user",icon:"mdi:account-multiple"},data:{label:"Data & history",icon:"mdi:chart-line"},integration:{label:"HACS integrations",icon:"mdi:puzzle"}};var mt=i(214),ft=i(720),yt=function(e,t,i,n,o,r){function a(e){if(void 0!==e&&"function"!=typeof e)throw new TypeError("Function expected");return e}for(var s,c=n.kind,l="getter"===c?"get":"setter"===c?"set":"value",d=!t&&e?n.static?e:e.prototype:null,p=t||(d?Object.getOwnPropertyDescriptor(d,n.name):{}),u=!1,h=i.length-1;h>=0;h--){var g={};for(var _ in n)g[_]="access"===_?{}:n[_];for(var _ in n.access)g.access[_]=n.access[_];g.addInitializer=function(e){if(u)throw new TypeError("Cannot add initializers after decoration has completed");r.push(a(e||null))};var m=(0,i[h])("accessor"===c?{get:p.get,set:p.set}:p[l],g);if("accessor"===c){if(void 0===m)continue;if(null===m||"object"!=typeof m)throw new TypeError("Object expected");(s=a(m.get))&&(p.get=s),(s=a(m.set))&&(p.set=s),(s=a(m.init))&&o.unshift(s)}else(s=a(m))&&("field"===c?o.unshift(s):p[l]=s)}d&&Object.defineProperty(d,n.name,p),u=!0},vt=function(e,t,i){for(var n=arguments.length>2,o=0;o<t.length;o++)i=n?t[o].call(e,i):t[o].call(e);return n?i:void 0},bt=function(e,t,i,n){if("a"===i&&!n)throw new TypeError("Private accessor was defined without a getter");if("function"==typeof t?e!==t||!n:!t.has(e))throw new TypeError("Cannot read private member from an object whose class did not declare it");return"m"===i?n:"a"===i?n.call(e):n?n.value:t.get(e)},xt=function(e,t,i,n,o){if("m"===n)throw new TypeError("Private method is not writable");if("a"===n&&!o)throw new TypeError("Private accessor was defined without a setter");if("function"==typeof t?e!==t||!o:!t.has(e))throw new TypeError("Cannot write private member to an object whose class did not declare it");return"a"===n?o.call(e,i):o?o.value=i:t.set(e,i),i};let wt=(()=>{var e,t,i,a,s;let c,l,d,p,u=n.WF,h=[],g=[],_=[],m=[],f=[],y=[],v=[],b=[];return e=class extends u{constructor(){super(...arguments),t.set(this,vt(this,h,{})),i.set(this,(vt(this,g),vt(this,_,new Set))),a.set(this,(vt(this,m),vt(this,f,new Map))),s.set(this,(vt(this,y),vt(this,v,void 0))),Object.defineProperty(this,"_hass",{enumerable:!0,configurable:!0,writable:!0,value:(vt(this,b),null)}),Object.defineProperty(this,"_isUpdatingConfig",{enumerable:!0,configurable:!0,writable:!0,value:!1}),Object.defineProperty(this,"_favoriteSearch",{enumerable:!0,configurable:!0,writable:!0,value:""}),Object.defineProperty(this,"_roomPinSearch",{enumerable:!0,configurable:!0,writable:!0,value:""}),Object.defineProperty(this,"_weatherSensorSearch",{enumerable:!0,configurable:!0,writable:!0,value:""}),Object.defineProperty(this,"_securityExtraSearch",{enumerable:!0,configurable:!0,writable:!0,value:""}),Object.defineProperty(this,"_lightFavSearch",{enumerable:!0,configurable:!0,writable:!0,value:""}),Object.defineProperty(this,"_areaEntitiesCache",{enumerable:!0,configurable:!0,writable:!0,value:new Map}),Object.defineProperty(this,"_areaEntitiesCacheKey",{enumerable:!0,configurable:!0,writable:!0,value:null}),Object.defineProperty(this,"_draggedElement",{enumerable:!0,configurable:!0,writable:!0,value:null}),Object.defineProperty(this,"_sectionDraggedElement",{enumerable:!0,configurable:!0,writable:!0,value:null}),Object.defineProperty(this,"_openPreview",{enumerable:!0,configurable:!0,writable:!0,value:()=>{let e="/";try{const t=(document.referrer||window.location.pathname).match(/\/([a-z0-9_-]+)(?:\/\d+)?(?:\?.*)?$/i);t&&t[1]&&(e=`/${t[1]}/0`)}catch{}window.open(e,"_blank","noopener,noreferrer")}}),Object.defineProperty(this,"_dismissUsageSuggestion",{enumerable:!0,configurable:!0,writable:!0,value:()=>{const e={...this._config,_usage_suggestion_dismissed:!0};this._config=e,this._fireConfigChanged(e)}}),Object.defineProperty(this,"_applyAllMigrations",{enumerable:!0,configurable:!0,writable:!0,value:()=>{const e=(0,mt.vi)(this._config);this._config=e,this._fireConfigChanged(e)}}),Object.defineProperty(this,"_handleSectionDragStart",{enumerable:!0,configurable:!0,writable:!0,value:e=>{if(!e.target.closest(".drag-handle"))return void e.preventDefault();const t=e.target.closest(".section-order-item");t?(t.classList.add("dragging"),e.dataTransfer&&(e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",t.dataset.sectionKey||"")),this._sectionDraggedElement=t):e.preventDefault()}}),Object.defineProperty(this,"_handleSectionDragEnd",{enumerable:!0,configurable:!0,writable:!0,value:e=>{const t=e.target.closest(".section-order-item");t&&t.classList.remove("dragging");const i=this.shadowRoot?.querySelector("#section-order-list");i&&i.querySelectorAll(".section-order-item").forEach(e=>{e.classList.remove("drag-over")}),this._sectionDraggedElement=null}}),Object.defineProperty(this,"_handleSectionDragOver",{enumerable:!0,configurable:!0,writable:!0,value:e=>{e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move");const t=e.currentTarget;t!==this._sectionDraggedElement&&t.classList.add("drag-over")}}),Object.defineProperty(this,"_handleSectionDragLeave",{enumerable:!0,configurable:!0,writable:!0,value:e=>{e.currentTarget.classList.remove("drag-over")}}),Object.defineProperty(this,"_handleSectionDrop",{enumerable:!0,configurable:!0,writable:!0,value:e=>{e.stopPropagation(),e.preventDefault();const t=e.currentTarget;if(t.classList.remove("drag-over"),!this._sectionDraggedElement||this._sectionDraggedElement===t)return;const i=this._sectionDraggedElement.dataset.sectionKey,n=t.dataset.sectionKey;if(!i||!n)return;const o=this._getSectionsOrder(),r=o.indexOf(i),a=o.indexOf(n);if(-1===r||-1===a)return;const s=[...o];s.splice(r,1),s.splice(a,0,i),this._updateSectionsOrder(s)}}),Object.defineProperty(this,"_powerBadgeEntityChanged",{enumerable:!0,configurable:!0,writable:!0,value:e=>{const t=e.target.value,i={...this._config};t?i.power_badge_entity=t:delete i.power_badge_entity,this._fireConfigChanged(i)}}),Object.defineProperty(this,"_handleDragStart",{enumerable:!0,configurable:!0,writable:!0,value:e=>{if(!e.target.closest(".drag-handle"))return void e.preventDefault();const t=e.target.closest(".area-item");t?(t.classList.add("dragging"),e.dataTransfer&&(e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",t.dataset.areaId||"")),this._draggedElement=t):e.preventDefault()}}),Object.defineProperty(this,"_handleDragEnd",{enumerable:!0,configurable:!0,writable:!0,value:e=>{const t=e.target.closest(".area-item");t&&t.classList.remove("dragging");const i=this.shadowRoot.querySelector("#area-list");i&&i.querySelectorAll(".area-item").forEach(e=>{e.classList.remove("drag-over")})}}),Object.defineProperty(this,"_handleDragOver",{enumerable:!0,configurable:!0,writable:!0,value:e=>{e.preventDefault(),e.dataTransfer.dropEffect="move";const t=e.currentTarget;t!==this._draggedElement&&t.classList.add("drag-over")}}),Object.defineProperty(this,"_handleDragLeave",{enumerable:!0,configurable:!0,writable:!0,value:e=>{e.currentTarget.classList.remove("drag-over")}}),Object.defineProperty(this,"_handleDrop",{enumerable:!0,configurable:!0,writable:!0,value:e=>{e.stopPropagation(),e.preventDefault();const t=e.currentTarget;if(t.classList.remove("drag-over"),!this._draggedElement||this._draggedElement===t)return;const i=this._draggedElement.dataset.areaId,n=t.dataset.areaId;if(!i||!n)return;const o=this._getAreaOrder(),r=o.indexOf(i),a=o.indexOf(n);if(-1===r||-1===a)return;const s=[...o];s.splice(r,1),s.splice(a,0,i),this._updateAreaOrder(s)}}),Object.defineProperty(this,"_entityDraggedId",{enumerable:!0,configurable:!0,writable:!0,value:null}),Object.defineProperty(this,"_handleEntityDragStart",{enumerable:!0,configurable:!0,writable:!0,value:(e,t)=>{const i=e.target.closest(".entity-list-item");i?(i.classList.add("dragging"),this._entityDraggedId=i.dataset.entityId||null,e.dataTransfer&&(e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",this._entityDraggedId||""))):e.preventDefault()}}),Object.defineProperty(this,"_handleEntityDragEnd",{enumerable:!0,configurable:!0,writable:!0,value:e=>{const t=e.target.closest(".entity-list-item");t&&t.classList.remove("dragging"),this._entityDraggedId=null}}),Object.defineProperty(this,"_handleEntityDragOver",{enumerable:!0,configurable:!0,writable:!0,value:e=>{e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move");const t=e.currentTarget;t.dataset.entityId!==this._entityDraggedId&&t.classList.add("drag-over")}}),Object.defineProperty(this,"_handleEntityDragLeave",{enumerable:!0,configurable:!0,writable:!0,value:e=>{e.currentTarget.classList.remove("drag-over")}}),Object.defineProperty(this,"_handleEntityDrop",{enumerable:!0,configurable:!0,writable:!0,value:(e,t)=>{e.stopPropagation(),e.preventDefault();const i=e.currentTarget;i.classList.remove("drag-over");const n=this._entityDraggedId,o=i.dataset.entityId;if(!n||!o||n===o)return;const r=this._config.favorite_entities,a=Array.isArray(r)?r:[],s="favorites"===t?[...a]:[...this._config.room_pin_entities||[]],c=s.indexOf(n),l=s.indexOf(o);if(-1===c||-1===l)return;s.splice(c,1),s.splice(l,0,n);const d="favorites"===t?"favorite_entities":"room_pin_entities",p={...this._config,[d]:s};this._config=p,this._fireConfigChanged(p)}})}get _config(){return bt(this,t,"f")}set _config(e){xt(this,t,e,"f")}get _expandedAreas(){return bt(this,i,"f")}set _expandedAreas(e){xt(this,i,e,"f")}get _expandedGroups(){return bt(this,a,"f")}set _expandedGroups(e){xt(this,a,e,"f")}get _setupCollapsedOverride(){return bt(this,s,"f")}set _setupCollapsedOverride(e){xt(this,s,e,"f")}set hass(e){const t=this._hass;this._hass=e,e.entities!==this._areaEntitiesCacheKey&&(this._areaEntitiesCache.clear(),this._areaEntitiesCacheKey=e.entities),t||this.requestUpdate()}setConfig(e){this._isUpdatingConfig||(this._config=e)}_checkSearchCardDependencies(){const e=void 0!==customElements.get("search-card"),t=void 0!==customElements.get("card-tools");return e&&t}_getAllEntitiesForSelect(){if(!this._hass)return[];const e=Object.values(this._hass.entities),t=Object.values(this._hass.devices),i=new Map;t.forEach(e=>{e.area_id&&i.set(e.id,e.area_id)});const n=this._hass;return Object.keys(n.states).map(t=>{const o=n.states[t],r=e.find(e=>e.entity_id===t);let a=r?.area_id;return!a&&r?.device_id&&(a=i.get(r.device_id)??null),{entity_id:t,name:o?.attributes?.friendly_name||(t.split(".")[1]??t).replace(/_/g," "),area_id:a,device_area_id:a}}).sort((e,t)=>e.name.localeCompare(t.name))}_getAlarmEntities(){return this._hass?Object.keys(this._hass.states).filter(e=>e.startsWith("alarm_control_panel.")).map(e=>{const t=this._hass.states[e];return{entity_id:e,name:t?.attributes?.friendly_name||(e.split(".")[1]??e).replace(/_/g," ")}}).sort((e,t)=>e.name.localeCompare(t.name)):[]}_getWeatherEntities(){return this._hass?Object.keys(this._hass.states).filter(e=>e.startsWith("weather.")).map(e=>{const t=this._hass.states[e];return{entity_id:e,name:t?.attributes?.friendly_name||(e.split(".")[1]??e).replace(/_/g," ")}}).sort((e,t)=>e.name.localeCompare(t.name)):[]}_getPowerSensorEntities(){return this._hass?Object.keys(this._hass.states).filter(e=>{if(!e.startsWith("sensor."))return!1;const t=this._hass.states[e],i=t?.attributes?.device_class,n=t?.attributes?.unit_of_measurement;return"power"===i||"W"===n||"kW"===n}).map(e=>{const t=this._hass.states[e];return{entity_id:e,name:t?.attributes?.friendly_name||(e.split(".")[1]??e).replace(/_/g," ")}}).sort((e,t)=>e.name.localeCompare(t.name)):[]}_getFilteredEntities(e,t=!1){if(!this._hass||e.length<2)return[];const i=e.toLowerCase(),n=this._getAllEntitiesForSelect().filter(e=>!(t&&!e.area_id&&!e.device_area_id)&&(e.name.toLowerCase().includes(i)||e.entity_id.toLowerCase().includes(i)));return n.sort((e,t)=>{const n=e.name.toLowerCase(),o=t.name.toLowerCase(),r=e.entity_id.toLowerCase(),a=t.entity_id.toLowerCase(),s=n===i||r===i;if(s!==(o===i||a===i))return s?-1:1;const c=n.startsWith(i)||r.startsWith(i)||r.split(".")[1]?.startsWith(i);return c!==(o.startsWith(i)||a.startsWith(i)||a.split(".")[1]?.startsWith(i))?c?-1:1:n.localeCompare(o)}),n.slice(0,21)}render(){return this._hass?n.qy`
      <div class="card-config">
        <div class="preview-action" style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
          <button
            class="btn-primary"
            @click=${this._openPreview}
            title=${(0,st.localize)("editor.preview_dashboard")||"Open the dashboard in a new tab to preview your changes"}
          >
            ${(0,st.localize)("editor.preview_dashboard")||"👁  Preview dashboard"}
          </button>
        </div>
        ${this._renderMigrationBanner()}
        ${this._renderUsageSuggestion()}
        ${this._renderSetupSection()}
        ${this._renderOverviewSection()}
        ${this._renderSummariesSection()}
        ${this._renderFavoritesSection()}
        ${this._renderLightFavoritesSection()}

        <div class="section-divider">
          <div class="section-divider-title">
            ${(0,st.localize)("editor.section_areas_rooms")}
          </div>
        </div>

        ${this._renderAreasSection()}
        ${this._renderRoomPinsSection()}
        ${this._renderViewsSection()}

        <div class="section-divider">
          <div class="section-divider-title">
            ${(0,st.localize)("editor.section_advanced")}
          </div>
        </div>

        ${this._renderSectionOrderPanel()}
        ${this._renderWeatherSensorsSection()}
        ${this._renderCustomCardsSection()}
        ${this._renderCustomSectionsSection()}
        ${this._renderCustomBadgesSection()}
        ${this._renderCustomViewsSection()}
      </div>
    `:n.s6}_renderUsageSuggestion(){if(!this._hass)return n.qy``;if(!(0,ft.FN)())return n.qy``;if(this._config._usage_suggestion_dismissed)return n.qy``;const e=this._getSectionsOrder(),t=(0,ft.p1)(e);if(!t)return n.qy``;const i=(0,ft.Tn)();return n.qy`
      <div class="oriel-usage-banner">
        <div class="oriel-usage-title">
          <ha-icon icon="mdi:lightbulb-on-outline"></ha-icon>
          <strong>Suggested layout from your usage</strong>
          <span class="oriel-usage-stats">(based on ${i} taps)</span>
        </div>
        <div class="oriel-usage-body">
          Your most-used sections aren't currently at the top. Apply the
          suggested order or dismiss to keep the current layout.
        </div>
        <div class="oriel-usage-order">
          ${t.order.map((e,t)=>n.qy`<span class="oriel-usage-chip">${t+1}. ${e}</span>`)}
        </div>
        <div class="oriel-usage-actions">
          <button class="oriel-usage-apply"
                  @click=${()=>this._applyUsageSuggestion(t.order)}>
            Apply
          </button>
          <button class="oriel-usage-dismiss" @click=${this._dismissUsageSuggestion}>
            Dismiss
          </button>
        </div>
      </div>
    `}_applyUsageSuggestion(e){this._updateSectionsOrder(e)}_renderMigrationBanner(){if(!this._hass)return n.qy``;const e=(0,mt.dz)(this._config);return 0===e.length?n.qy``:n.qy`
      <div class="oriel-migration-banner">
        <div class="oriel-migration-title">
          <ha-icon icon="mdi:update"></ha-icon>
          <strong>${e.length} config update${1===e.length?"":"s"} available</strong>
        </div>
        ${e.map(e=>n.qy`
            <div class="oriel-migration-row">
              <div>
                <div class="oriel-migration-label">${e.label}</div>
                <div class="oriel-migration-desc">${e.description}</div>
              </div>
              <button class="oriel-migration-apply" @click=${()=>this._applyMigration(e)}>
                Apply
              </button>
            </div>
          `)}
        <div class="oriel-migration-footer">
          <button class="oriel-migration-applyall" @click=${this._applyAllMigrations}>
            Apply all
          </button>
        </div>
      </div>
    `}_applyMigration(e){const t=e.apply(this._config);this._config=t,this._fireConfigChanged(t)}_renderSetupSection(){if(!this._hass)return n.qy``;const e=!0===this._config._onboarding_seen,t=this._setupCollapsedOverride??e;return function(e){var t;const i={};for(const e of gt.xu)(i[t=e.category]||(i[t]=[])).push(e);let o=0,r=0;for(const t of gt.xu){const i=t.detect(e.hass);i.installed&&r++,i.installed&&t.isEnabled&&t.isEnabled(e.config)&&o++}return n.qy`
    <div class="setup-panel">
      <div class="setup-header" @click=${e.onToggleCollapsed}>
        <div class="setup-header-title">
          <ha-icon icon="mdi:rocket-launch-outline"></ha-icon>
          <span>Setup &amp; advanced features</span>
        </div>
        <div class="setup-header-stats">
          <span>${o} active</span>
          <span class="setup-header-divider">·</span>
          <span>${r}/${gt.xu.length} available</span>
          <ha-icon icon=${e.collapsed?"mdi:chevron-down":"mdi:chevron-up"}></ha-icon>
        </div>
      </div>

      ${e.collapsed?n.s6:n.qy`
            <div class="setup-intro">
              Choose what your dashboard does. Built-in features are always
              available. HACS features auto-light-up when their plugin is
              installed.
              <button class="setup-dismiss" @click=${e.onDismiss}>
                Hide this section
              </button>
            </div>

            ${Object.keys(i).map(t=>function(e,t,i){if(0===t.length)return n.qy``;const o=_t[e];return n.qy`
    <div class="setup-category">
      <div class="setup-category-header">
        <ha-icon icon=${o.icon}></ha-icon>
        <span>${o.label}</span>
      </div>
      ${t.map(e=>function(e,t){const i=e.detect(t.hass),o=!!e.isEnabled&&e.isEnabled(t.config),r=!!e.toggle&&i.installed,a=i.installed?o?"mdi:check-circle":"mdi:circle-outline":"mdi:download",s=i.installed?o?"active":"inactive":"missing";return n.qy`
    <div class="setup-feature setup-feature--${s}">
      <ha-icon class="setup-feature-status" icon=${a}></ha-icon>
      <div class="setup-feature-body">
        <div class="setup-feature-title">${e.label}</div>
        <div class="setup-feature-desc">${e.description}</div>
        ${i.detail?n.qy`<div class="setup-feature-detail">${i.detail}</div>`:n.s6}
        ${!i.installed&&e.hacs?n.qy`
              <div class="setup-feature-hacs">
                Requires
                <a
                  href=${`https://github.com/${e.hacs.repository}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  >${e.hacs.name}</a
                >
                — install via HACS, then refresh this page.
              </div>
            `:n.s6}
      </div>
      <div class="setup-feature-action">
        ${r?n.qy`
              <ha-switch
                .checked=${o}
                @change=${i=>t.onFeatureToggle(e.id,i.target.checked)}
              ></ha-switch>
            `:i.installed?e.toggle?n.s6:n.qy`<span class="setup-feature-tag">always on</span>`:n.qy`<span class="setup-feature-tag">missing</span>`}
      </div>
    </div>
  `}(e,i))}
    </div>
  `}(t,i[t]??[],e))}
          `}
    </div>
  `}({hass:this._hass,config:this._config,collapsed:t,onToggleCollapsed:()=>{this._setupCollapsedOverride=!t,this.requestUpdate()},onDismiss:()=>{const e={...this._config,_onboarding_seen:!0};this._config=e,this._setupCollapsedOverride=!0,this._fireConfigChanged(e)},onFeatureToggle:(e,t)=>this._onFeatureToggle(e,t)})}_onFeatureToggle(e,t){const i=(0,gt.Su)(e);if(!i||!i.toggle)return;const n=i.toggle(t),o={...this._config};for(const[e,t]of Object.entries(n))void 0===t?delete o[e]:o[e]=t;this._config=o,this._fireConfigChanged(o)}_getSectionsOrder(){return this._config.sections_order||[...at.G]}_updateSectionsOrder(e){const t={...this._config,sections_order:e};this._config=t,this._fireConfigChanged(t)}_isSectionDisabled(e){switch(e){case"custom_cards":return 0===(this._config.custom_cards||[]).length;case"weather":return!1===this._config.show_weather;case"energy":return!1===this._config.show_energy;case"plants":return!0!==this._config.show_plants_section;case"agenda":return!0!==this._config.show_agenda_section;case"todos":return!0!==this._config.show_todos_section;case"persons":return!0!==this._config.show_persons_section;case"vacuums":return!0!==this._config.show_vacuums_section;case"maintenance":return!0!==this._config.show_maintenance_section;default:return!1}}_isSectionToggleable(e){return"weather"===e||"energy"===e||"plants"===e||"agenda"===e||"todos"===e||"persons"===e||"vacuums"===e||"maintenance"===e}_toggleSectionVisibility(e,t){"weather"===e?this._toggleChanged("show_weather",t,!0):"energy"===e?this._toggleChanged("show_energy",t,!0):"plants"===e?this._toggleChanged("show_plants_section",t,!1):"agenda"===e?this._toggleChanged("show_agenda_section",t,!1):"todos"===e?this._toggleChanged("show_todos_section",t,!1):"persons"===e?this._toggleChanged("show_persons_section",t,!1):"vacuums"===e?this._toggleChanged("show_vacuums_section",t,!1):"maintenance"===e&&this._toggleChanged("show_maintenance_section",t,!1)}_setWeatherPresentation(e){const t={...this._config,weather_presentation:e};delete t.show_weather_forecast_card,this._config=t,this._fireConfigChanged(t)}_renderSectionOrderPanel(){return this._hass?ht({hass:this._hass,config:this._config,order:this._getSectionsOrder(),sectionMeta:e._sectionMeta,weatherEntities:this._getWeatherEntities(),powerSensorEntities:this._getPowerSensorEntities(),isSectionDisabled:e=>this._isSectionDisabled(e),isSectionToggleable:e=>this._isSectionToggleable(e),onToggleChange:(e,t,i)=>this._toggleChanged(e,t,i),onSetWeatherPresentation:e=>this._setWeatherPresentation(e),onWeatherEntityChange:e=>this._weatherEntityChanged(e),onPowerBadgeEntityChange:e=>this._powerBadgeEntityChanged(e),onToggleSectionVisibility:(e,t)=>this._toggleSectionVisibility(e,t),onToggleHiddenHeading:(e,t)=>this._toggleHiddenHeading(e,t),onSectionVisibilityChange:(e,t,i)=>this._sectionVisibilityChanged(e,t,i),onDragStart:this._handleSectionDragStart,onDragEnd:this._handleSectionDragEnd,onDragOver:this._handleSectionDragOver,onDragLeave:this._handleSectionDragLeave,onDrop:this._handleSectionDrop}):n.qy``}_toggleHiddenHeading(e,t){const i=new Set(this._config.hidden_section_headings||[]);t?i.add(e):i.delete(e);const n=[...i],o={...this._config};0===n.length?delete o.hidden_section_headings:o.hidden_section_headings=n,this._fireConfigChanged(o)}_sectionVisibilityChanged(e,t,i){const n={...this._config},o={...n.section_visibility||{}},r={...o[e]||{entity:"",state:""}};r[t]=i.trim(),r.entity||r.state?o[e]=r:delete o[e],0===Object.keys(o).length?delete n.section_visibility:n.section_visibility=o,this._fireConfigChanged(n)}_renderOverviewSection(){if(!this._hass)return n.qy``;const e=this._checkSearchCardDependencies(),t=!0===this._config.show_search_card;return n.qy`
      ${function(e){const{hass:t,config:i,onChange:o}=e,r=function(e){return{show_clock_card:!1!==e.show_clock_card,person_badge_layout:e.person_badge_layout??"with_state",alarm_entity:e.alarm_entity??"",show_search_card:!0===e.show_search_card,search_card_variant:"tip"===e.search_card_variant?"tip":"custom",show_person_badges:!1!==e.show_person_badges}}(i),a=function(e){const t=["minimal","with_state","with_state_and_time"].map(e=>({value:e,label:(0,st.localize)(`editor.person_badge_layout_${e}`)})),i=["custom","tip"].map(e=>({value:e,label:(0,st.localize)(`editor.search_card_variant_${e}`)})),n=[{name:"show_clock_card",selector:{boolean:{}}},{name:"person_badge_layout",selector:{select:{mode:"list",options:t}}},{name:"alarm_entity",selector:{entity:{filter:{domain:"alarm_control_panel"}}}},{name:"show_search_card",selector:{boolean:{}}}];return e.show_search_card&&n.push({name:"search_card_variant",selector:{select:{mode:"list",options:i}}}),n.push({name:"show_person_badges",selector:{boolean:{}}}),n}(r);return n.qy`
    <div class="section">
      <div class="section-title">${(0,st.localize)("editor.section_overview")}</div>
      <ha-form
        .hass=${t}
        .data=${r}
        .schema=${a}
        .computeLabel=${e=>(0,st.localize)(`editor.${e.name}`)}
        .computeHelper=${e=>{const t=`editor.${e.name}_desc`,i=(0,st.localize)(t);return i===t?"":i}}
        @value-changed=${e=>{o(function(e){const t={};return t.show_clock_card=!1!==e.show_clock_card&&void 0,t.person_badge_layout=e.person_badge_layout&&"with_state"!==e.person_badge_layout?e.person_badge_layout:void 0,t.alarm_entity=e.alarm_entity?e.alarm_entity:void 0,t.show_search_card=!0===e.show_search_card||void 0,t.search_card_variant="tip"===e.search_card_variant?"tip":void 0,t.show_person_badges=!1!==e.show_person_badges&&void 0,t}(e.detail.value))}}
      ></ha-form>
    </div>
  `}({hass:this._hass,config:this._config,onChange:e=>{const t={...this._config,...e};for(const i of Object.keys(e))void 0===e[i]&&delete t[i];this._config=t,this._fireConfigChanged(t)}})}
      ${t&&!e?n.qy`<div class="description" style="margin-top: -8px;">
            <span>&#x26A0;&#xFE0F; ${(0,r._)((0,st.localize)("editor.show_search_card_missing"))}</span>
          </div>`:n.s6}
    `}_searchCardVariantChanged(e){const t={...this._config};"custom"===e?delete t.search_card_variant:t.search_card_variant=e,this._fireConfigChanged(t)}_renderSummariesSection(){return this._hass?function(e){const{hass:t,config:i,onChange:o,securityExtraSlot:r}=e,a={summaries_columns:4===(s=i).summaries_columns?4:2,show_light_summary:!1!==s.show_light_summary,group_lights_by_floors:!0===s.group_lights_by_floors,nested_light_groups:!0===s.nested_light_groups,lights_sort_by:"name"===s.lights_sort_by?"name":"last_changed",show_covers_summary:!1!==s.show_covers_summary,show_partially_open_covers:!0===s.show_partially_open_covers,group_covers_by_floors:!0===s.group_covers_by_floors,show_security_summary:!1!==s.show_security_summary,show_climate_summary:!0===s.show_climate_summary,show_battery_summary:!1!==s.show_battery_summary,hide_mobile_app_batteries:!0===s.hide_mobile_app_batteries,show_area_in_battery_view:!0===s.show_area_in_battery_view,hide_battery_notes_entities:!0===s.hide_battery_notes_entities,battery_critical_threshold:s.battery_critical_threshold??20,battery_low_threshold:s.battery_low_threshold??50,unavailable_batteries_bucket:"critical"===s.unavailable_batteries_bucket?"critical":"good"};var s;return n.qy`
    <div class="section">
      <div class="section-title">${(0,st.localize)("editor.section_summaries")}</div>
      <ha-form
        .hass=${t}
        .data=${a}
        .schema=${dt}
        .computeLabel=${e=>(0,st.localize)(`editor.${e.name}`)}
        .computeHelper=${e=>{const t=`editor.${e.name}_desc`,i=(0,st.localize)(t);return i===t?"":i}}
        @value-changed=${e=>{o(function(e){const t={};return t.summaries_columns=4===e.summaries_columns?4:void 0,t.show_light_summary=!1!==e.show_light_summary&&void 0,t.show_covers_summary=!1!==e.show_covers_summary&&void 0,t.show_security_summary=!1!==e.show_security_summary&&void 0,t.show_battery_summary=!1!==e.show_battery_summary&&void 0,t.group_lights_by_floors=!0===e.group_lights_by_floors||void 0,t.nested_light_groups=!0===e.nested_light_groups||void 0,t.show_partially_open_covers=!0===e.show_partially_open_covers||void 0,t.group_covers_by_floors=!0===e.group_covers_by_floors||void 0,t.show_climate_summary=!0===e.show_climate_summary||void 0,t.hide_mobile_app_batteries=!0===e.hide_mobile_app_batteries||void 0,t.show_area_in_battery_view=!0===e.show_area_in_battery_view||void 0,t.hide_battery_notes_entities=!0===e.hide_battery_notes_entities||void 0,t.lights_sort_by="name"===e.lights_sort_by?"name":void 0,t.unavailable_batteries_bucket="critical"===e.unavailable_batteries_bucket?"critical":void 0,t.battery_critical_threshold="number"==typeof e.battery_critical_threshold&&20!==e.battery_critical_threshold?e.battery_critical_threshold:void 0,t.battery_low_threshold="number"==typeof e.battery_low_threshold&&50!==e.battery_low_threshold?e.battery_low_threshold:void 0,t}(e.detail.value))}}
      ></ha-form>
      ${r}
    </div>
  `}({hass:this._hass,config:this._config,securityExtraSlot:this._renderSecurityExtraEntitiesPicker(),onChange:e=>{const t={...this._config,...e};for(const i of Object.keys(e))void 0===e[i]&&delete t[i];this._config=t,this._fireConfigChanged(t)}}):n.qy``}_renderSecurityExtraEntitiesPicker(){const e=this._config.security_extra_entities||[],t=this._getAllEntitiesForSelect(),i=new Map(t.map(e=>[e.entity_id,e.name])),o=this._getFilteredEntities(this._securityExtraSearch);return n.qy`
      <div style="font-size: 13px; font-weight: 500; color: var(--primary-text-color); margin-top: 4px; margin-bottom: 4px;">
        ${(0,st.localize)("editor.security_extra_entities")}
      </div>
      <div class="description" style="margin-left: 0; margin-bottom: 8px;">
        ${(0,st.localize)("editor.security_extra_entities_desc")}
      </div>
      ${e.length>0?n.qy`
        <div class="entity-list-container" style="margin-bottom: 8px;">
          ${e.map(e=>{const t=i.get(e)||e;return n.qy`
              <div class="entity-list-item" data-entity-id=${e}>
                <span class="item-info">
                  <span class="item-name">${t}</span>
                  <span class="item-entity-id">${e}</span>
                </span>
                <button class="btn-remove" @click=${()=>this._removeSecurityExtraEntity(e)}>&#x2715;</button>
              </div>
            `})}
        </div>
      `:n.s6}
      <div class="entity-search-picker">
        <input type="text" class="entity-search-input"
          placeholder=${(0,st.localize)("editor.select_entity")+"..."}
          .value=${this._securityExtraSearch}
          @input=${e=>{this._securityExtraSearch=e.target.value,this.requestUpdate()}}
          @blur=${()=>{setTimeout(()=>{this._securityExtraSearch="",this.requestUpdate()},200)}}
        />
        ${this._securityExtraSearch.length>=2?n.qy`
          <div class="entity-search-results">
            ${o.length>0?o.map(e=>n.qy`
                <div class="entity-search-result" @mousedown=${t=>{t.preventDefault(),this._addSecurityExtraEntity(e.entity_id),this._securityExtraSearch="",this.requestUpdate()}}>
                  <span class="entity-search-name">${e.name}</span>
                  <span class="entity-search-id">${e.entity_id}</span>
                </div>
              `):n.qy`<div class="entity-search-no-results">${(0,st.localize)("editor.no_results")}</div>`}
          </div>
        `:n.s6}
      </div>
    `}_addSecurityExtraEntity(e){const t=this._config.security_extra_entities||[];if(t.includes(e))return;const i={...this._config,security_extra_entities:[...t,e]};this._fireConfigChanged(i)}_removeSecurityExtraEntity(e){const t=(this._config.security_extra_entities||[]).filter(t=>t!==e),i={...this._config};0===t.length?delete i.security_extra_entities:i.security_extra_entities=t,this._fireConfigChanged(i)}_renderLightFavoritesSection(){if(!this._hass)return n.qy``;const e=this._getAllEntitiesForSelect();return function(e){const t=e.config.light_favorite_entities||[];return n.qy`
    <div class="section">
      <div class="section-title">${(0,st.localize)("editor.section_light_favorites")}</div>

      ${t.length>0?n.qy`
            <div class="entity-list-container" style="margin-bottom: 8px;">
              ${t.map(t=>{const i=e.entityNameMap.get(t)||t;return n.qy`
                  <div class="entity-list-item" data-entity-id=${t}>
                    <span class="item-info">
                      <span class="item-name">${i}</span>
                      <span class="item-entity-id">${t}</span>
                    </span>
                    <button class="btn-remove" @click=${()=>e.onRemoveEntity(t)}>
                      &#x2715;
                    </button>
                  </div>
                `})}
            </div>
          `:n.s6}

      <div class="entity-search-picker">
        <input
          type="text"
          class="entity-search-input"
          placeholder=${(0,st.localize)("editor.select_entity")+"..."}
          .value=${e.search}
          @input=${t=>e.onSearchChange(t.target.value)}
          @blur=${()=>setTimeout(()=>e.onSearchChange(""),200)}
        />
        ${e.search.length>=2?n.qy`
              <div class="entity-search-results">
                ${e.filteredEntities.length>0?e.filteredEntities.map(t=>n.qy`
                        <div
                          class="entity-search-result"
                          @mousedown=${i=>{i.preventDefault(),e.onAddEntity(t.entity_id),e.onSearchChange("")}}
                        >
                          <span class="entity-search-name">${t.name}</span>
                          <span class="entity-search-id">${t.entity_id}</span>
                        </div>
                      `):n.qy`<div class="entity-search-no-results">${(0,st.localize)("editor.no_results")}</div>`}
              </div>
            `:n.s6}
      </div>
      <div class="description">${(0,st.localize)("editor.light_favorites_desc")}</div>
    </div>
  `}({config:this._config,search:this._lightFavSearch,entityNameMap:new Map(e.map(e=>[e.entity_id,e.name])),filteredEntities:this._getFilteredEntities(this._lightFavSearch).filter(e=>e.entity_id.startsWith("light.")),onSearchChange:e=>{this._lightFavSearch=e,this.requestUpdate()},onAddEntity:e=>this._addLightFavorite(e),onRemoveEntity:e=>this._removeLightFavorite(e)})}_unavailableBatteriesBucketChanged(e){const t={...this._config};"good"===e?delete t.unavailable_batteries_bucket:t.unavailable_batteries_bucket=e,this._fireConfigChanged(t)}_lightsSortByChanged(e){const t={...this._config};"last_changed"===e?delete t.lights_sort_by:t.lights_sort_by=e,this._fireConfigChanged(t)}_addLightFavorite(e){const t=this._config.light_favorite_entities||[];if(t.includes(e))return;const i={...this._config,light_favorite_entities:[...t,e]};this._fireConfigChanged(i)}_removeLightFavorite(e){const t=(this._config.light_favorite_entities||[]).filter(t=>t!==e),i={...this._config};0===t.length?delete i.light_favorite_entities:i.light_favorite_entities=t,this._fireConfigChanged(i)}_renderFavoritesSection(){if(!this._hass)return n.qy``;const e=this._getAllEntitiesForSelect();return function(e){const t=e.config.favorite_entities,i=Array.isArray(t)?t:[],o=!0===e.config.favorites_show_state,r=!0===e.config.favorites_hide_last_changed;return n.qy`
    <div class="section">
      <div class="section-title">${(0,st.localize)("editor.section_favorites")}</div>

      <div id="favorites-list" style="margin-bottom: 12px;">
        ${0===i.length?n.qy`<div class="empty-state">${(0,st.localize)("editor.no_favorites")}</div>`:n.qy`
              <div class="entity-list-container">
                ${i.map(t=>{const i=e.entityNameMap.get(t)||t;return n.qy`
                    <div
                      class="entity-list-item"
                      data-entity-id=${t}
                      draggable="true"
                      @dragstart=${e.onDragStart}
                      @dragend=${e.onDragEnd}
                      @dragover=${e.onDragOver}
                      @dragleave=${e.onDragLeave}
                      @drop=${e.onDrop}
                    >
                      <span class="drag-icon">&#x2630;</span>
                      <span class="item-info">
                        <span class="item-name">${i}</span>
                        <span class="item-entity-id">${t}</span>
                      </span>
                      <button class="btn-remove" @click=${()=>e.onRemoveEntity(t)}>
                        &#x2715;
                      </button>
                    </div>
                  `})}
              </div>
            `}
      </div>

      <div class="entity-search-picker">
        <input
          type="text"
          class="entity-search-input"
          placeholder=${(0,st.localize)("editor.select_entity")+"..."}
          .value=${e.search}
          @input=${t=>e.onSearchChange(t.target.value)}
          @blur=${()=>setTimeout(()=>e.onSearchChange(""),200)}
        />
        ${e.search.length>=2?n.qy`
              <div class="entity-search-results">
                ${e.filteredEntities.length>0?e.filteredEntities.map(t=>n.qy`
                        <div
                          class="entity-search-result"
                          @mousedown=${i=>{i.preventDefault(),e.onAddEntity(t.entity_id),e.onSearchChange("")}}
                        >
                          <span class="entity-search-name">${t.name}</span>
                          <span class="entity-search-id">${t.entity_id}</span>
                        </div>
                      `):n.qy`<div class="entity-search-no-results">${(0,st.localize)("editor.no_results")}</div>`}
              </div>
            `:n.s6}
      </div>
      <div class="description">${(0,st.localize)("editor.favorites_desc")}</div>

      ${e.renderCheckbox("favorites-show-state",(0,st.localize)("editor.show_state"),o,t=>e.onToggleChange("favorites_show_state",t,!1))}
      ${e.renderCheckbox("favorites-hide-last-changed",(0,st.localize)("editor.hide_last_changed"),r,t=>e.onToggleChange("favorites_hide_last_changed",t,!1))}
    </div>
  `}({config:this._config,search:this._favoriteSearch,entityNameMap:new Map(e.map(e=>[e.entity_id,e.name])),filteredEntities:this._getFilteredEntities(this._favoriteSearch),renderCheckbox:(e,t,i,n)=>this._renderCheckbox(e,t,i,n),onSearchChange:e=>{this._favoriteSearch=e,this.requestUpdate()},onAddEntity:e=>this._addFavoriteEntity(e),onRemoveEntity:e=>this._removeFavoriteEntity(e),onToggleChange:(e,t,i)=>this._toggleChanged(e,t,i),onDragStart:e=>this._handleEntityDragStart(e,"favorites"),onDragEnd:this._handleEntityDragEnd,onDragOver:this._handleEntityDragOver,onDragLeave:this._handleEntityDragLeave,onDrop:e=>this._handleEntityDrop(e,"favorites")})}_renderWeatherSensorsSection(){if(!this._hass)return n.qy``;const e=this._getAllEntitiesForSelect();return function(e){const t=e.config.weather_sensors||[];return n.qy`
    <div class="section">
      <div class="section-title">${(0,st.localize)("editor.section_weather_sensors")}</div>
      <div class="description" style="margin-left: 0; margin-bottom: 12px;">
        ${(0,st.localize)("editor.weather_sensors_desc")}
      </div>

      <div id="weather-sensors-list" style="margin-bottom: 12px;">
        ${0===t.length?n.qy`<div class="empty-state">${(0,st.localize)("editor.no_weather_sensors")}</div>`:t.map((t,i)=>{const o=e.entityNameMap.get(t.entity)||t.entity;return n.qy`
                <div class="custom-item" data-sensor-index=${i}>
                  <div class="custom-item-header">
                    <strong>
                      ${o}
                      <span class="item-entity-id" style="font-weight: normal; margin-left: 8px;">
                        ${t.entity}
                      </span>
                    </strong>
                    <button class="btn-remove" @click=${()=>e.onRemoveSensor(i)}>
                      &#x2715;
                    </button>
                  </div>
                  <div class="custom-item-fields">
                    <div class="custom-item-row">
                      <input
                        type="text"
                        style="flex: 2;"
                        placeholder=${(0,st.localize)("editor.weather_sensors_icon")}
                        .value=${t.icon||""}
                        @change=${t=>e.onUpdateSensor(i,"icon",t.target.value)}
                      />
                      <input
                        type="text"
                        style="flex: 1;"
                        placeholder=${(0,st.localize)("editor.weather_sensors_unit")}
                        .value=${t.unit||""}
                        @change=${t=>e.onUpdateSensor(i,"unit",t.target.value)}
                      />
                      <input
                        type="number"
                        style="flex: 1;"
                        min="0"
                        max="6"
                        step="1"
                        placeholder=${(0,st.localize)("editor.weather_sensors_round")}
                        .value=${void 0!==t.round?String(t.round):""}
                        @change=${t=>e.onUpdateSensor(i,"round",t.target.value)}
                      />
                    </div>
                  </div>
                </div>
              `})}
      </div>

      <div class="entity-search-picker">
        <input
          type="text"
          class="entity-search-input"
          placeholder=${(0,st.localize)("editor.weather_sensors_add")}
          .value=${e.search}
          @input=${t=>e.onSearchChange(t.target.value)}
          @blur=${()=>setTimeout(()=>e.onSearchChange(""),200)}
        />
        ${e.search.length>=2?n.qy`
              <div class="entity-search-results">
                ${e.filteredEntities.length>0?e.filteredEntities.map(t=>n.qy`
                        <div
                          class="entity-search-result"
                          @mousedown=${i=>{i.preventDefault(),e.onAddSensor(t.entity_id),e.onSearchChange("")}}
                        >
                          <span class="entity-search-name">${t.name}</span>
                          <span class="entity-search-id">${t.entity_id}</span>
                        </div>
                      `):n.qy`<div class="entity-search-no-results">${(0,st.localize)("editor.no_results")}</div>`}
              </div>
            `:n.s6}
      </div>
    </div>
  `}({config:this._config,search:this._weatherSensorSearch,entityNameMap:new Map(e.map(e=>[e.entity_id,e.name])),filteredEntities:this._getFilteredEntities(this._weatherSensorSearch),onSearchChange:e=>{this._weatherSensorSearch=e,this.requestUpdate()},onAddSensor:e=>this._addWeatherSensor(e),onRemoveSensor:e=>this._removeWeatherSensor(e),onUpdateSensor:(e,t,i)=>this._updateWeatherSensor(e,t,i)})}_inferWeatherSensorDefaults(t){const i=this._hass?.states[t],n=i?.attributes||{},o={},r="string"==typeof n.device_class?n.device_class:void 0,a=r?e._DEVICE_CLASS_DEFAULTS[r]:void 0,s=("string"==typeof n.icon?n.icon:void 0)||a?.icon;s&&e._ICON_RE.test(s)&&(o.icon=s);const c="string"==typeof n.unit_of_measurement?n.unit_of_measurement:void 0;return c&&c.length>0&&(o.unit=c),a&&void 0!==a.round&&(o.round=a.round),o}_addWeatherSensor(e){if(!this._hass)return;const t=this._config.weather_sensors||[];if(t.some(t=>t.entity===e))return;const i=this._inferWeatherSensorDefaults(e),n={entity:e,...i},o={...this._config,weather_sensors:[...t,n]};this._config=o,this._fireConfigChanged(o)}_removeWeatherSensor(e){const t=this._config.weather_sensors||[];if(e<0||e>=t.length)return;const i=[...t.slice(0,e),...t.slice(e+1)],n={...this._config};i.length>0?n.weather_sensors=i:delete n.weather_sensors,this._config=n,this._fireConfigChanged(n)}_updateWeatherSensor(e,t,i){const n=this._config.weather_sensors||[];if(e<0||e>=n.length)return;const o={...n[e]},r=i.trim();if("round"===t)if(""===r)delete o.round;else{const e=Number.parseInt(r,10);Number.isFinite(e)&&e>=0&&(o.round=e)}else if("icon"===t||"unit"===t)""===r?delete o[t]:o[t]=r;else if("entity"===t)return;const a=[...n];a[e]=o;const s={...this._config,weather_sensors:a};this._config=s,this._fireConfigChanged(s)}_renderAreasSection(){return this._hass?function(e){const t=e.config,i=!0===t.group_by_floors,o=!0===t.show_switches_on_areas,r=!0===t.show_alerts_on_areas,a=!0===t.show_window_alerts_on_areas,s=!0===t.show_locks_in_rooms,c=!0===t.show_automations_in_rooms,l=!0===t.show_scripts_in_rooms,d=!1!==t.show_cameras_in_rooms,p=!1!==t.show_window_contacts_in_rooms,u=!1!==t.show_door_contacts_in_rooms,h=!0===t.use_default_area_sort,g=Object.values(e.hass.areas).sort((e,t)=>e.name.localeCompare(t.name)),_=t.areas_display?.hidden||[],m=t.areas_display?.order||[];return n.qy`
    <div class="section">
      <div class="section-title">${(0,st.localize)("editor.section_areas")}</div>

      ${e.renderCheckbox("group-by-floors",(0,st.localize)("editor.group_by_floors"),i,t=>e.onToggleChange("group_by_floors",t,!1))}
      <div class="description">${(0,st.localize)("editor.group_by_floors_desc")}</div>

      ${e.renderCheckbox("show-switches-on-areas",(0,st.localize)("editor.show_switches_on_areas"),o,t=>e.onToggleChange("show_switches_on_areas",t,!1))}
      <div class="description">${(0,st.localize)("editor.show_switches_on_areas_desc")}</div>

      ${e.renderCheckbox("show-alerts-on-areas",(0,st.localize)("editor.show_alerts_on_areas"),r,t=>e.onToggleChange("show_alerts_on_areas",t,!1))}
      <div class="description">${(0,st.localize)("editor.show_alerts_on_areas_desc")}</div>

      ${e.renderCheckbox("show-window-alerts-on-areas",(0,st.localize)("editor.show_window_alerts_on_areas"),a,t=>e.onToggleChange("show_window_alerts_on_areas",t,!1))}
      <div class="description">${(0,st.localize)("editor.show_window_alerts_on_areas_desc")}</div>

      ${e.renderCheckbox("show-locks-in-rooms",(0,st.localize)("editor.show_locks_in_rooms"),s,t=>e.onToggleChange("show_locks_in_rooms",t,!1))}
      <div class="description">${(0,st.localize)("editor.show_locks_in_rooms_desc")}</div>

      ${e.renderCheckbox("show-automations-in-rooms",(0,st.localize)("editor.show_automations_in_rooms"),c,t=>e.onToggleChange("show_automations_in_rooms",t,!1))}
      <div class="description">${(0,st.localize)("editor.show_automations_in_rooms_desc")}</div>

      ${e.renderCheckbox("show-scripts-in-rooms",(0,st.localize)("editor.show_scripts_in_rooms"),l,t=>e.onToggleChange("show_scripts_in_rooms",t,!1))}
      <div class="description">${(0,st.localize)("editor.show_scripts_in_rooms_desc")}</div>

      ${e.renderCheckbox("show-cameras-in-rooms",(0,st.localize)("editor.show_cameras_in_rooms"),d,t=>e.onToggleChange("show_cameras_in_rooms",t,!0))}
      <div class="description">${(0,st.localize)("editor.show_cameras_in_rooms_desc")}</div>

      ${e.renderCheckbox("show-window-contacts-in-rooms",(0,st.localize)("editor.show_window_contacts_in_rooms"),p,t=>e.onToggleChange("show_window_contacts_in_rooms",t,!0))}
      <div class="description">${(0,st.localize)("editor.show_window_contacts_in_rooms_desc")}</div>

      ${e.renderCheckbox("show-door-contacts-in-rooms",(0,st.localize)("editor.show_door_contacts_in_rooms"),u,t=>e.onToggleChange("show_door_contacts_in_rooms",t,!0))}
      <div class="description">${(0,st.localize)("editor.show_door_contacts_in_rooms_desc")}</div>

      ${e.renderCheckbox("hide-unavailable-in-rooms",(0,st.localize)("editor.hide_unavailable_in_rooms"),!1!==t.hide_unavailable_in_rooms,t=>e.onToggleChange("hide_unavailable_in_rooms",t,!0))}
      <div class="description">${(0,st.localize)("editor.hide_unavailable_in_rooms_desc")}</div>

      ${e.renderCheckbox("use-default-area-sort",(0,st.localize)("editor.use_default_area_sort"),h,t=>e.onToggleChange("use_default_area_sort",t,!1))}
      <div class="description">${(0,st.localize)("editor.use_default_area_sort_desc")}</div>

      <div class="description" style="margin-left: 0; margin-top: 16px; margin-bottom: 12px;">
        ${(0,st.localize)("editor.areas_manage_desc")}
      </div>

      <div class="area-list" id="area-list">
        ${e.renderAreaItems(g,_,m)}
      </div>

      <details style="margin-top: 12px;">
        <summary
          style="cursor: pointer; font-size: 13px; font-weight: 500; color: var(--primary-text-color); padding: 4px 0;"
        >
          ${(0,st.localize)("editor.room_visibility")}
        </summary>
        <div style="margin-left: 14px; margin-top: 6px;">
          <div class="description" style="margin-left: 0; margin-bottom: 8px;">
            ${(0,st.localize)("editor.room_visibility_desc")}
          </div>
          ${g.filter(e=>!_.includes(e.area_id)).map(i=>{const o=t.room_visibility?.[i.area_id];return n.qy`
                <div
                  style="border: 1px solid var(--divider-color); border-radius: 6px; padding: 8px; margin-bottom: 8px;"
                >
                  <div style="font-weight: 500; margin-bottom: 6px;">${i.name}</div>
                  <div class="form-row">
                    <label
                      for="room-vis-entity-${i.area_id}"
                      style="min-width: 80px; font-size: 12px;"
                      >${(0,st.localize)("editor.section_visibility_entity")}</label
                    >
                    <input
                      type="text"
                      id="room-vis-entity-${i.area_id}"
                      style="flex: 1;"
                      placeholder="input_boolean.guest_mode"
                      .value=${o?.entity||""}
                      @change=${t=>e.onRoomVisibilityChange(i.area_id,"entity",t.target.value)}
                    />
                  </div>
                  <div class="form-row">
                    <label
                      for="room-vis-state-${i.area_id}"
                      style="min-width: 80px; font-size: 12px;"
                      >${(0,st.localize)("editor.section_visibility_state")}</label
                    >
                    <input
                      type="text"
                      id="room-vis-state-${i.area_id}"
                      style="flex: 1;"
                      placeholder="on"
                      .value=${o?.state||""}
                      @change=${t=>e.onRoomVisibilityChange(i.area_id,"state",t.target.value)}
                    />
                  </div>
                </div>
              `})}
        </div>
      </details>
    </div>
  `}({hass:this._hass,config:this._config,renderCheckbox:(e,t,i,n,o)=>this._renderCheckbox(e,t,i,n,o),renderAreaItems:(e,t,i)=>this._renderAreaItems(e,t,i),onToggleChange:(e,t,i)=>this._toggleChanged(e,t,i),onRoomVisibilityChange:(e,t,i)=>this._roomVisibilityChanged(e,t,i)}):n.qy``}_roomVisibilityChanged(e,t,i){const n={...this._config},o={...n.room_visibility||{}},r={...o[e]||{entity:"",state:""}};r[t]=i.trim(),r.entity||r.state?o[e]=r:delete o[e],0===Object.keys(o).length?delete n.room_visibility:n.room_visibility=o,this._fireConfigChanged(n)}_renderRoomPinsSection(){return this._hass?function(e){const t=e.config.room_pin_entities||[],i=!0===e.config.room_pins_show_state,o=!0===e.config.room_pins_hide_last_changed,a="bottom"===e.config.room_pins_position?"bottom":"top",s=Object.values(e.hass.areas).sort((e,t)=>e.name.localeCompare(t.name)),c=new Map(e.allEntitiesForSelect.map(e=>[e.entity_id,e])),l=new Map(s.map(e=>[e.area_id,e.name]));return n.qy`
    <div class="section">
      <div class="section-title">${(0,st.localize)("editor.section_room_pins")}</div>

      <div id="room-pins-list" style="margin-bottom: 12px;">
        ${0===t.length?n.qy`<div class="empty-state">${(0,st.localize)("editor.no_room_pins")}</div>`:n.qy`
              <div class="entity-list-container">
                ${t.map(t=>{const i=c.get(t),o=i?.name||t,r=i?.area_id||i?.device_area_id,a=r?l.get(r)||r:(0,st.localize)("editor.no_room");return n.qy`
                    <div
                      class="entity-list-item"
                      data-entity-id=${t}
                      draggable="true"
                      @dragstart=${e.onDragStart}
                      @dragend=${e.onDragEnd}
                      @dragover=${e.onDragOver}
                      @dragleave=${e.onDragLeave}
                      @drop=${e.onDrop}
                    >
                      <span class="drag-icon">&#x2630;</span>
                      <span class="item-info">
                        <span class="item-name">${o}</span>
                        <span class="item-entity-id">${t}</span>
                        <span class="item-area">&#x1F4CD; ${a}</span>
                      </span>
                      <button class="btn-remove" @click=${()=>e.onRemoveEntity(t)}>
                        &#x2715;
                      </button>
                    </div>
                  `})}
              </div>
            `}
      </div>

      <div class="entity-search-picker">
        <input
          type="text"
          class="entity-search-input"
          placeholder=${(0,st.localize)("editor.select_entity")+"..."}
          .value=${e.search}
          @input=${t=>e.onSearchChange(t.target.value)}
          @blur=${()=>setTimeout(()=>e.onSearchChange(""),200)}
        />
        ${e.search.length>=2?n.qy`
              <div class="entity-search-results">
                ${e.filteredEntities.length>0?e.filteredEntities.map(t=>n.qy`
                        <div
                          class="entity-search-result"
                          @mousedown=${i=>{i.preventDefault(),e.onAddEntity(t.entity_id),e.onSearchChange("")}}
                        >
                          <span class="entity-search-name">${t.name}</span>
                          <span class="entity-search-id">${t.entity_id}</span>
                        </div>
                      `):n.qy`<div class="entity-search-no-results">${(0,st.localize)("editor.no_results")}</div>`}
              </div>
            `:n.s6}
      </div>
      <div class="description">${(0,r._)((0,st.localize)("editor.room_pins_desc"))}</div>

      ${e.renderCheckbox("room-pins-show-state",(0,st.localize)("editor.show_state"),i,t=>e.onToggleChange("room_pins_show_state",t,!1))}
      ${e.renderCheckbox("room-pins-hide-last-changed",(0,st.localize)("editor.hide_last_changed"),o,t=>e.onToggleChange("room_pins_hide_last_changed",t,!1))}

      <div
        style="font-size: 13px; font-weight: 500; color: var(--primary-text-color); margin-top: 12px; margin-bottom: 4px;"
      >
        ${(0,st.localize)("editor.room_pins_position")}
      </div>
      <div class="form-row">
        <input
          type="radio"
          id="room-pins-top"
          name="room-pins-position"
          value="top"
          ?checked=${"top"===a}
          @change=${()=>e.onPositionChange("top")}
        />
        <label for="room-pins-top">${(0,st.localize)("editor.room_pins_position_top")}</label>
      </div>
      <div class="form-row">
        <input
          type="radio"
          id="room-pins-bottom"
          name="room-pins-position"
          value="bottom"
          ?checked=${"bottom"===a}
          @change=${()=>e.onPositionChange("bottom")}
        />
        <label for="room-pins-bottom">${(0,st.localize)("editor.room_pins_position_bottom")}</label>
      </div>
      <div class="description">${(0,st.localize)("editor.room_pins_position_desc")}</div>
    </div>
  `}({hass:this._hass,config:this._config,search:this._roomPinSearch,allEntitiesForSelect:this._getAllEntitiesForSelect(),filteredEntities:this._getFilteredEntities(this._roomPinSearch,!0),renderCheckbox:(e,t,i,n)=>this._renderCheckbox(e,t,i,n),onSearchChange:e=>{this._roomPinSearch=e,this.requestUpdate()},onAddEntity:e=>this._addRoomPinEntity(e),onRemoveEntity:e=>this._removeRoomPinEntity(e),onPositionChange:e=>this._roomPinsPositionChanged(e),onToggleChange:(e,t,i)=>this._toggleChanged(e,t,i),onDragStart:e=>this._handleEntityDragStart(e,"room_pins"),onDragEnd:this._handleEntityDragEnd,onDragOver:this._handleEntityDragOver,onDragLeave:this._handleEntityDragLeave,onDrop:e=>this._handleEntityDrop(e,"room_pins")}):n.qy``}_roomPinsPositionChanged(e){const t={...this._config};"top"===e?delete t.room_pins_position:t.room_pins_position=e,this._fireConfigChanged(t)}_renderViewsSection(){return this._hass?function(e){const{hass:t,config:i,onChange:o}=e,r={show_summary_views:!0===i.show_summary_views,show_room_views:!0===i.show_room_views};return n.qy`
    <div class="section">
      <div class="section-title">${(0,st.localize)("editor.section_views")}</div>
      <ha-form
        .hass=${t}
        .data=${r}
        .schema=${lt}
        .computeLabel=${e=>(0,st.localize)(`editor.${e.name}`)}
        .computeHelper=${e=>(0,st.localize)(`editor.${e.name}_desc`)}
        @value-changed=${e=>{const t={};for(const i of Object.keys(e.detail.value)){const n=e.detail.value[i];t[i]=!0===n||void 0}o(t)}}
      ></ha-form>
    </div>
  `}({hass:this._hass,config:this._config,onChange:e=>{const t={...this._config,...e};for(const i of Object.keys(e))void 0===e[i]&&delete t[i];this._config=t,this._fireConfigChanged(t)}}):n.qy``}_renderCustomCardsSection(){return this._hass?function(e){const t=e.config.custom_cards||[],i=e.config.custom_cards_heading||"",o=e.config.custom_cards_icon||"";return n.qy`
    <div class="section">
      <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
        ${(0,st.localize)("editor.section_custom_cards")}
      </div>
      <div class="custom-item-row" style="margin-bottom: 12px;">
        <input
          type="text"
          id="custom-cards-heading"
          .value=${i}
          placeholder=${(0,st.localize)("editor.custom_cards_heading_placeholder")}
          style="flex: 2;"
          @change=${t=>e.onHeadingChange(t.target.value)}
        />
        <input
          type="text"
          id="custom-cards-icon"
          .value=${o}
          placeholder="mdi:cards"
          style="flex: 1;"
          @change=${t=>e.onIconChange(t.target.value)}
        />
      </div>
      <div class="description" style="margin-bottom: 8px;">
        ${(0,st.localize)("editor.custom_cards_desc")}
      </div>

      <div id="custom-cards-list">
        ${0===t.length?n.qy`<div class="empty-state">${(0,st.localize)("editor.no_custom_cards")}</div>`:t.map((t,i)=>function(e,t,i){const o=t._yaml_error?n.qy`<span style="color: var(--error-color);">&#x274C; ${t._yaml_error}</span>`:t.yaml?n.qy`<span style="color: var(--success-color, green);">&#x2705; ${(0,st.localize)("editor.yaml_valid")}</span>`:n.s6;return n.qy`
    <div class="custom-item" data-index=${i}>
      <div class="custom-item-header">
        <strong>${t.title||(0,st.localize)("editor.new_card")}</strong>
        <button class="btn-remove" @click=${()=>e.onRemoveCard(i)}>&#x2715;</button>
      </div>
      <div class="custom-item-fields">
        <input
          type="text"
          .value=${t.title||""}
          placeholder=${(0,st.localize)("editor.card_title_placeholder")}
          @change=${t=>e.onUpdateField(i,"title",t.target.value)}
        />
        <div class="custom-card-target">
          <label>${(0,st.localize)("editor.target_section")}:</label>
          <select
            @change=${t=>e.onUpdateField(i,"target_section",t.target.value)}
          >
            ${[...e.sectionMeta.entries()].map(([e,i])=>n.qy`
                <option value=${e} ?selected=${(t.target_section||"custom_cards")===e}>
                  ${(0,st.localize)(i.labelKey)}
                </option>
              `)}
          </select>
        </div>
        <textarea
          rows="6"
          placeholder=${(0,st.localize)("editor.yaml_placeholder")}
          .value=${t.yaml||""}
          style="width: 100%;"
          @change=${t=>e.onUpdateYaml(i,t.target.value)}
        ></textarea>
        <div class="custom-item-validation">${o}</div>
      </div>
    </div>
  `}(e,t,i))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${()=>e.onAddCard()}>
        ${(0,st.localize)("editor.add_custom_card")}
      </button>
      <div class="description">${(0,st.localize)("editor.custom_cards_help")}</div>
    </div>
  `}({config:this._config,sectionMeta:e._sectionMeta,onHeadingChange:e=>this._customCardsHeadingChanged({target:{value:e}}),onIconChange:e=>this._customCardsIconChanged({target:{value:e}}),onAddCard:()=>this._addCustomCard(),onRemoveCard:e=>this._removeCustomCard(e),onUpdateField:(e,t,i)=>this._updateCustomCardField(e,t,i),onUpdateYaml:(e,t)=>this._updateCustomCardYaml(e,t)}):n.qy``}_renderCustomSectionsSection(){return this._hass?function(e){const t=e.config.custom_sections||[];return n.qy`
    <div class="section">
      <div class="section-title">${(0,st.localize)("editor.section_custom_sections")}</div>
      <div class="description" style="margin-bottom: 8px;">
        ${(0,st.localize)("editor.custom_sections_desc")}
      </div>

      <div id="custom-sections-list">
        ${0===t.length?n.qy`<div class="empty-state">${(0,st.localize)("editor.no_custom_sections")}</div>`:t.map((t,i)=>function(e,t,i){const o=t._yaml_error?n.qy`<span style="color: var(--error-color);">&#x274C; ${t._yaml_error}</span>`:t.parsed_config?n.qy`<span style="color: var(--success-color, green);">&#x2705; ${(0,st.localize)("editor.yaml_valid")}</span>`:n.qy``;return n.qy`
    <div class="custom-item">
      <div class="custom-item-header">
        <span class="custom-item-index">#${i+1}</span>
        <button
          class="btn-icon"
          @click=${()=>e.onRemove(i)}
          title=${(0,st.localize)("editor.remove")}
        >
          &#x274C;
        </button>
      </div>
      <div class="custom-item-fields">
        <input
          type="text"
          .value=${t.key||""}
          placeholder=${(0,st.localize)("editor.custom_section_key_placeholder")}
          @change=${t=>e.onUpdateField(i,"key",t.target.value)}
        />
        <input
          type="text"
          .value=${t.heading||""}
          placeholder=${(0,st.localize)("editor.custom_section_heading_placeholder")}
          @change=${t=>e.onUpdateField(i,"heading",t.target.value)}
        />
        <input
          type="text"
          .value=${t.icon||""}
          placeholder="mdi:card-bulleted"
          @change=${t=>e.onUpdateField(i,"icon",t.target.value)}
        />
        <textarea
          rows="6"
          placeholder=${(0,st.localize)("editor.custom_section_yaml_placeholder")}
          .value=${t.yaml||""}
          style="width: 100%;"
          @change=${t=>e.onUpdateYaml(i,t.target.value)}
        ></textarea>
        <div class="custom-item-validation">${o}</div>
      </div>
    </div>
  `}(e,t,i))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${()=>e.onAdd()}>
        ${(0,st.localize)("editor.add_custom_section")}
      </button>
      <div class="description">${(0,st.localize)("editor.custom_sections_help")}</div>
    </div>
  `}({config:this._config,onAdd:()=>this._addCustomSection(),onRemove:e=>this._removeCustomSection(e),onUpdateField:(e,t,i)=>this._updateCustomSectionField(e,t,i),onUpdateYaml:(e,t)=>this._updateCustomSectionYaml(e,t)}):n.qy``}_renderCustomBadgesSection(){return this._hass?function(e){const t=e.config.custom_badges||[];return n.qy`
    <div class="section">
      <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
        ${(0,st.localize)("editor.section_custom_badges")}
      </div>

      <div id="custom-badges-list">
        ${0===t.length?n.qy`<div class="empty-state">${(0,st.localize)("editor.no_custom_badges")}</div>`:t.map((t,i)=>function(e,t,i){const o=t._yaml_error?n.qy`<span style="color: var(--error-color);">&#x274C; ${t._yaml_error}</span>`:t.yaml?n.qy`<span style="color: var(--success-color, green);">&#x2705; ${(0,st.localize)("editor.yaml_valid")}</span>`:n.s6;return n.qy`
    <div class="custom-item" data-index=${i}>
      <div class="custom-item-header">
        <strong>Badge ${i+1}</strong>
        <button class="btn-remove" @click=${()=>e.onRemove(i)}>&#x2715;</button>
      </div>
      <textarea
        rows="4"
        placeholder="type: entity&#10;entity: sun.sun"
        .value=${t.yaml||""}
        style="width: 100%;"
        @change=${t=>e.onUpdateYaml(i,t.target.value)}
      ></textarea>
      <div class="custom-item-validation">${o}</div>
    </div>
  `}(e,t,i))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${()=>e.onAdd()}>
        ${(0,st.localize)("editor.add_custom_badge")}
      </button>
      <div class="description">${(0,st.localize)("editor.custom_badges_help")}</div>
    </div>
  `}({config:this._config,onAdd:()=>this._addCustomBadge(),onRemove:e=>this._removeCustomBadge(e),onUpdateYaml:(e,t)=>this._updateCustomBadgeYaml(e,t)}):n.qy``}_renderCustomViewsSection(){return this._hass?function(e){const t=e.config.custom_views||[];return n.qy`
    <div class="section">
      <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
        ${(0,st.localize)("editor.section_custom_views")}
      </div>

      <div id="custom-views-list">
        ${0===t.length?n.qy`<div class="empty-state">${(0,st.localize)("editor.no_custom_views")}</div>`:t.map((t,i)=>function(e,t,i){const o=t._yaml_error?n.qy`<span style="color: var(--error-color);">&#x274C; ${t._yaml_error}</span>`:t.yaml?n.qy`<span style="color: var(--success-color, green);">&#x2705; ${(0,st.localize)("editor.yaml_valid")}</span>`:n.s6;return n.qy`
    <div class="custom-item" data-index=${i}>
      <div class="custom-item-header">
        <strong>${t.title||(0,st.localize)("editor.new_view")}</strong>
        <button class="btn-remove" @click=${()=>e.onRemove(i)}>&#x2715;</button>
      </div>
      <div class="custom-item-fields">
        <div class="custom-item-row">
          <input
            type="text"
            .value=${t.title||""}
            placeholder=${(0,st.localize)("editor.title_placeholder")}
            style="flex: 2;"
            @change=${t=>e.onUpdateField(i,"title",t.target.value)}
          />
          <input
            type="text"
            .value=${t.path||""}
            placeholder=${(0,st.localize)("editor.path_placeholder")}
            style="flex: 2;"
            @change=${t=>e.onUpdateField(i,"path",t.target.value)}
          />
          <input
            type="text"
            .value=${t.icon||""}
            placeholder="mdi:star"
            style="flex: 1;"
            @change=${t=>e.onUpdateField(i,"icon",t.target.value)}
          />
        </div>
        <textarea
          rows="8"
          placeholder=${(0,st.localize)("editor.yaml_placeholder")}
          .value=${t.yaml||""}
          style="width: 100%;"
          @change=${t=>e.onUpdateYaml(i,t.target.value)}
        ></textarea>
        <div class="custom-item-validation">${o}</div>
      </div>
    </div>
  `}(e,t,i))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${()=>e.onAdd()}>
        ${(0,st.localize)("editor.add_custom_view")}
      </button>
      <div class="description">${(0,st.localize)("editor.custom_views_help")}</div>
    </div>
  `}({config:this._config,onAdd:()=>this._addCustomView(),onRemove:e=>this._removeCustomView(e),onUpdateField:(e,t,i)=>this._updateCustomViewField(e,t,i),onUpdateYaml:(e,t)=>this._updateCustomViewYaml(e,t)}):n.qy``}_renderCheckbox(e,t,i,o,r=!1){return n.qy`
      <div class="form-row">
        <input type="checkbox" id=${e}
          ?checked=${i}
          ?disabled=${r}
          @change=${e=>o(e.target.checked)} />
        <label for=${e} class=${r?"disabled-label":""}>${t}</label>
      </div>
    `}_renderAreaItems(e,t,i){return 0===e.length?n.qy`<div class="empty-state">${(0,st.localize)("editor.no_areas")}</div>`:[...e].sort((t,n)=>{const o=i.indexOf(t.area_id),r=i.indexOf(n.area_id);return(-1!==o?o:9999+e.indexOf(t))-(-1!==r?r:9999+e.indexOf(n))}).map(e=>{const i=t.includes(e.area_id),o=this._expandedAreas.has(e.area_id),r=this._areaEntitiesCache.get(e.area_id);return n.qy`
        <div class="area-item"
          data-area-id=${e.area_id}
          draggable="true"
          @dragstart=${this._handleDragStart}
          @dragend=${this._handleDragEnd}
          @dragover=${this._handleDragOver}
          @dragleave=${this._handleDragLeave}
          @drop=${this._handleDrop}>
          <div class="area-header">
            <span class="drag-handle" draggable="true">&#x2630;</span>
            <input type="checkbox" class="area-checkbox"
              data-area-id=${e.area_id}
              ?checked=${!i}
              @change=${t=>this._areaVisibilityChanged(e.area_id,t.target.checked)} />
            <span class="area-name">${e.name}</span>
            ${e.icon?n.qy`<ha-icon class="area-icon" icon=${e.icon}></ha-icon>`:n.s6}
            <button class="expand-button ${o?"expanded":""}"
              data-area-id=${e.area_id}
              ?disabled=${i}
              @click=${t=>this._toggleAreaExpand(t,e.area_id)}>
              <span class="expand-icon">&#x25B6;</span>
            </button>
          </div>
          ${o?n.qy`
              <div class="area-content" data-area-id=${e.area_id}>
                ${r?this._renderAreaEntities(e.area_id,r):n.qy`<div class="loading-placeholder">${(0,st.localize)("editor.loading_entities")}</div>`}
              </div>
            `:n.s6}
        </div>
      `})}_renderAreaEntities(e,t){const{groupedEntities:i,hiddenEntities:o,badgeCandidates:r,additionalBadges:a,availableEntities:s,defaultShowNames:c,namesVisible:l,namesHidden:d}=t,p=this._hass,u=[{key:"lights",label:(0,st.localize)("editor.domain_lights"),icon:"mdi:lightbulb"},{key:"climate",label:(0,st.localize)("editor.domain_climate"),icon:"mdi:thermostat"},{key:"covers",label:(0,st.localize)("editor.domain_covers"),icon:"mdi:window-shutter"},{key:"covers_curtain",label:(0,st.localize)("editor.domain_covers_curtain"),icon:"mdi:curtains"},{key:"covers_window",label:(0,st.localize)("editor.domain_covers_window"),icon:"mdi:window-open-variant"},{key:"media_player",label:(0,st.localize)("editor.domain_media_player"),icon:"mdi:speaker"},{key:"scenes",label:(0,st.localize)("editor.domain_scenes"),icon:"mdi:palette"},{key:"vacuum",label:(0,st.localize)("editor.domain_vacuum"),icon:"mdi:robot-vacuum"},{key:"fan",label:(0,st.localize)("editor.domain_fan"),icon:"mdi:fan"},{key:"switches",label:(0,st.localize)("editor.domain_switches"),icon:"mdi:light-switch"},{key:"locks",label:(0,st.localize)("editor.domain_locks"),icon:"mdi:lock"}],h=u.some(e=>(i[e.key]?.length??0)>0),g=(r?.length??0)>0||(a?.length??0)>0;if(!h&&!g)return n.qy`<div class="empty-state">${(0,st.localize)("editor.no_entities_in_area")}</div>`;const _=this._expandedGroups.get(e)||new Set;return n.qy`
      <div class="entity-groups">
        ${u.map(t=>{const r=i[t.key];if(!r||0===r.length)return n.s6;const a=o[t.key]||[],s=r.every(e=>a.includes(e)),c=r.some(e=>a.includes(e))&&!s,l=_.has(t.key);return n.qy`
            <div class="entity-group" data-group=${t.key}>
              <div class="entity-group-header"
                @click=${()=>this._toggleGroupExpand(e,t.key)}>
                <input type="checkbox" class="group-checkbox"
                  data-area-id=${e}
                  data-group=${t.key}
                  ?checked=${!s}
                  .indeterminate=${c}
                  @click=${e=>e.stopPropagation()}
                  @change=${i=>{i.stopPropagation();const n=i.target.checked;this._groupVisibilityChanged(e,t.key,n,r)}} />
                <ha-icon icon=${t.icon}></ha-icon>
                <span class="group-name">${t.label}</span>
                <span class="entity-count">(${r.length})</span>
                <button class="expand-button-small ${l?"expanded":""}"
                  @click=${i=>{i.stopPropagation(),this._toggleGroupExpand(e,t.key)}}>
                  <span class="expand-icon-small">&#x25B6;</span>
                </button>
              </div>
              ${l?n.qy`
                  <div class="entity-list" data-area-id=${e} data-group=${t.key}>
                    ${r.map(i=>{const o=p.states[i],r=o?.attributes?.friendly_name||(i.split(".")[1]??i).replace(/_/g," "),s=a.includes(i);return n.qy`
                        <div class="entity-item">
                          <input type="checkbox" class="entity-checkbox"
                            ?checked=${!s}
                            @change=${n=>this._entityVisibilityChanged(e,t.key,i,n.target.checked)} />
                          <span class="entity-name">${r}</span>
                          <span class="entity-id">${i}</span>
                        </div>
                      `})}
                  </div>
                `:n.s6}
            </div>
          `})}
        ${g?this._renderBadgeGroup(e,r,a,s,o,c,l,d,_):n.s6}
      </div>
    `}_renderBadgeGroup(e,t,i,o,r,a,s,c,l){const d=this._hass,p=t.length+i.length;if(0===p)return n.qy``;const u=r.badges||[],h=t.length>0&&t.every(e=>u.includes(e)),g=t.some(e=>u.includes(e))&&!h,_=new Set(s||[]),m=new Set(c||[]),f=e=>(0,ct.LN)(e,a.has(e),_,m),y=l.has("badges");return n.qy`
      <div class="entity-group" data-group="badges">
        <div class="entity-group-header"
          @click=${()=>this._toggleGroupExpand(e,"badges")}>
          <input type="checkbox" class="group-checkbox"
            data-area-id=${e}
            data-group="badges"
            ?checked=${!h}
            .indeterminate=${g}
            @click=${e=>e.stopPropagation()}
            @change=${i=>{i.stopPropagation();const n=i.target.checked;this._groupVisibilityChanged(e,"badges",n,t)}} />
          <ha-icon icon="mdi:checkbox-multiple-blank-circle"></ha-icon>
          <span class="group-name">${(0,st.localize)("editor.domain_badges")}</span>
          <span class="entity-count">(${p})</span>
          <button class="expand-button-small ${y?"expanded":""}"
            @click=${t=>{t.stopPropagation(),this._toggleGroupExpand(e,"badges")}}>
            <span class="expand-icon-small">&#x25B6;</span>
          </button>
        </div>
        ${y?n.qy`
            <div class="entity-list" data-area-id=${e} data-group="badges">
              ${t.map(t=>{const i=d.states[t],o=i?.attributes?.friendly_name||(t.split(".")[1]??t).replace(/_/g," "),r=u.includes(t),a=f(t);return n.qy`
                  <div class="entity-item">
                    <input type="checkbox" class="entity-checkbox"
                      ?checked=${!r}
                      @change=${i=>this._entityVisibilityChanged(e,"badges",t,i.target.checked)} />
                    <span class="entity-name">${o}</span>
                    <input type="checkbox" class="badge-name-checkbox"
                      ?checked=${a}
                      title=${(0,st.localize)("editor.badges_show_name")}
                      @change=${i=>this._badgeShowNameChanged(e,t,i.target.checked)} />
                    <span class="badge-name-label">${(0,st.localize)("editor.badges_name_short")}</span>
                    <span class="entity-id">${t}</span>
                  </div>
                `})}

              ${i.length>0?n.qy`
                  <div class="badge-separator">${(0,st.localize)("editor.badges_additional")}</div>
                  ${i.map(t=>{const i=d.states[t],o=i?.attributes?.friendly_name||(t.split(".")[1]??t).replace(/_/g," "),r=f(t);return n.qy`
                      <div class="entity-item badge-additional-item">
                        <span class="entity-name">${o}</span>
                        <input type="checkbox" class="badge-name-checkbox"
                          ?checked=${r}
                          title=${(0,st.localize)("editor.badges_show_name")}
                          @change=${i=>this._badgeShowNameChanged(e,t,i.target.checked)} />
                        <span class="badge-name-label">${(0,st.localize)("editor.badges_name_short")}</span>
                        <span class="entity-id">${t}</span>
                        <button class="badge-remove-btn"
                          title=${(0,st.localize)("editor.badges_remove")}
                          @click=${()=>this._badgeAdditionalChanged(e,t,!1)}>&#x2715;</button>
                      </div>
                    `})}
                `:n.s6}

              ${o.length>0?n.qy`
                  <div class="badge-add-section">
                    <select class="badge-entity-picker" data-area-id=${e}>
                      <option value="">${(0,st.localize)("editor.badges_select_entity")}</option>
                      ${o.map(e=>n.qy`
                        <option value=${e.entity_id}>${e.name} (${e.entity_id})</option>
                      `)}
                    </select>
                    <button class="badge-add-button"
                      @click=${t=>this._addBadgeFromPicker(t,e)}>
                      ${(0,st.localize)("editor.badges_add")}
                    </button>
                  </div>
                `:n.s6}
            </div>
          `:n.s6}
      </div>
    `}async _loadAreaEntities(e){if(!this._hass)return;const t=await async function(e,t){const i=Object.values(t.devices||{}),n=Object.values(t.entities||{}),o=new Set;for(const t of i)t.area_id===e&&o.add(t.id);const r={lights:[],covers:[],covers_curtain:[],covers_window:[],scenes:[],climate:[],media_player:[],vacuum:[],fan:[],humidifier:[],valve:[],water_heater:[],switches:[],locks:[],automations:[],scripts:[],cameras:[]},a=n.filter(e=>e.labels?.includes("no_dboard")).map(e=>e.entity_id);for(const i of n){let n=!1;if(i.area_id?n=i.area_id===e:i.device_id&&o.has(i.device_id)&&(n=!0),!n)continue;if(a.includes(i.entity_id))continue;if(!t.states[i.entity_id])continue;if(i.hidden)continue;const s=t.entities?.[i.entity_id];if(s?.hidden)continue;const c=i.entity_id.split(".")[0],l=t.states[i.entity_id];if(!l)continue;const d=l.attributes?.device_class;"light"===c?r.lights.push(i.entity_id):"cover"===c?"curtain"===d?r.covers_curtain.push(i.entity_id):"window"===d||"door"===d||"gate"===d||"garage"===d?r.covers_window.push(i.entity_id):r.covers.push(i.entity_id):"scene"===c?r.scenes.push(i.entity_id):"climate"===c?r.climate.push(i.entity_id):"media_player"===c?r.media_player.push(i.entity_id):"vacuum"===c?r.vacuum.push(i.entity_id):"fan"===c?r.fan.push(i.entity_id):"switch"===c?r.switches.push(i.entity_id):"lock"===c&&r.locks.push(i.entity_id)}return r}(e,this._hass),i=zt(e,this._config),n=Et(e,this._config),o=$t(e,this._hass),r=Ct(e,this._config),a=kt(e,this._hass,o,r),s=St(o,this._hass),{namesVisible:c,namesHidden:l}=At(e,this._config);this._areaEntitiesCache.set(e,{groupedEntities:t,hiddenEntities:i,entityOrders:n,badgeCandidates:o,additionalBadges:r,availableEntities:a,defaultShowNames:s,namesVisible:c,namesHidden:l}),this.requestUpdate()}_refreshAreaCache(e){if(!this._hass||!this._areaEntitiesCache.has(e))return;const t=this._areaEntitiesCache.get(e).groupedEntities,i=zt(e,this._config),n=Et(e,this._config),o=$t(e,this._hass),r=Ct(e,this._config),a=kt(e,this._hass,o,r),s=St(o,this._hass),{namesVisible:c,namesHidden:l}=At(e,this._config);this._areaEntitiesCache.set(e,{groupedEntities:t,hiddenEntities:i,entityOrders:n,badgeCandidates:o,additionalBadges:r,availableEntities:a,defaultShowNames:s,namesVisible:c,namesHidden:l})}_toggleChanged(e,t,i){if(!this._hass)return;const n={...this._config,[e]:t};t===i&&delete n[e],this._config=n,this._fireConfigChanged(n)}_summariesColumnsChanged(e){if(!this._hass)return;const t={...this._config,summaries_columns:e};2===e&&delete t.summaries_columns,this._config=t,this._fireConfigChanged(t)}_personBadgeLayoutChanged(e){const t={...this._config};"with_state"===e?delete t.person_badge_layout:t.person_badge_layout=e,this._fireConfigChanged(t)}_alarmEntityChanged(e){if(!this._hass)return;const t=e.target.value,i={...this._config,alarm_entity:t};t&&""!==t||delete i.alarm_entity,this._config=i,this._fireConfigChanged(i)}_weatherEntityChanged(e){if(!this._hass)return;const t=e.target.value,i={...this._config,weather_entity:t};t&&""!==t||delete i.weather_entity,this._config=i,this._fireConfigChanged(i)}_batteryCriticalChanged(e){const t=parseInt(e.target.value,10);if(isNaN(t)||t<1||t>99)return;const i={...this._config,battery_critical_threshold:t};20===t&&delete i.battery_critical_threshold,this._config=i,this._fireConfigChanged(i)}_batteryLowChanged(e){const t=parseInt(e.target.value,10);if(isNaN(t)||t<1||t>99)return;const i={...this._config,battery_low_threshold:t};50===t&&delete i.battery_low_threshold,this._config=i,this._fireConfigChanged(i)}_addFavoriteFromSelect(){const e=this.shadowRoot.querySelector("#favorite-entity-select");e&&e.value&&(this._addFavoriteEntity(e.value),e.value="")}_addFavoriteEntity(e){if(!this._hass)return;const t=this._config.favorite_entities,i=Array.isArray(t)?t:[];if(i.includes(e))return;const n={...this._config,favorite_entities:[...i,e]};this._config=n,this._fireConfigChanged(n)}_removeFavoriteEntity(e){if(!this._hass)return;const t=this._config.favorite_entities,i=(Array.isArray(t)?t:[]).filter(t=>t!==e),n={...this._config,favorite_entities:i.length>0?i:void 0};0===i.length&&delete n.favorite_entities,this._config=n,this._fireConfigChanged(n)}_addRoomPinFromSelect(){const e=this.shadowRoot.querySelector("#room-pin-entity-select");e&&e.value&&(this._addRoomPinEntity(e.value),e.value="")}_addRoomPinEntity(e){if(!this._hass)return;const t=this._config.room_pin_entities||[];if(t.includes(e))return;const i={...this._config,room_pin_entities:[...t,e]};this._config=i,this._fireConfigChanged(i)}_removeRoomPinEntity(e){if(!this._hass)return;const t=(this._config.room_pin_entities||[]).filter(t=>t!==e),i={...this._config,room_pin_entities:t.length>0?t:void 0};0===t.length&&delete i.room_pin_entities,this._config=i,this._fireConfigChanged(i)}_addCustomView(){const e=[...this._config.custom_views||[]];e.push({title:"Neue View",path:`custom-view-${e.length+1}`,icon:"mdi:card-text-outline",yaml:"",parsed_config:void 0});const t={...this._config,custom_views:e};this._config=t,this._fireConfigChanged(t)}_removeCustomView(e){const t=[...this._config.custom_views||[]];t.splice(e,1);const i={...this._config};0===t.length?delete i.custom_views:i.custom_views=t,this._config=i,this._fireConfigChanged(i)}_updateCustomViewField(e,t,i){const n=[...this._config.custom_views||[]];if(!n[e])return;n[e]={...n[e],[t]:i};const o={...this._config,custom_views:n};this._config=o,this._fireConfigChanged(o)}_updateCustomViewYaml(e,t){const i=[...this._config.custom_views||[]];if(!i[e])return;const n={...i[e],yaml:t};if(delete n._yaml_error,t.trim())try{const e=rt.load(t);e&&"object"==typeof e?n.parsed_config=e:(n._yaml_error="YAML muss ein Objekt ergeben",n.parsed_config=void 0)}catch(e){const t=e instanceof Error?e.message.split("\n")[0]:"Ungültiges YAML";n._yaml_error=t||"Ungültiges YAML",n.parsed_config=void 0}else n.parsed_config=void 0;i[e]=n;const o={...this._config,custom_views:i};this._config=o,this._fireConfigChanged(o)}_customCardsHeadingChanged(e){const t=e.target.value.trim(),i={...this._config};t?i.custom_cards_heading=t:delete i.custom_cards_heading,this._config=i,this._fireConfigChanged(i)}_customCardsIconChanged(e){const t=e.target.value.trim(),i={...this._config};t?i.custom_cards_icon=t:delete i.custom_cards_icon,this._config=i,this._fireConfigChanged(i)}_addCustomCard(){const e=[...this._config.custom_cards||[]];e.push({title:"",yaml:"",parsed_config:void 0});const t={...this._config,custom_cards:e};this._config=t,this._fireConfigChanged(t)}_removeCustomCard(e){const t=[...this._config.custom_cards||[]];t.splice(e,1);const i={...this._config};0===t.length?delete i.custom_cards:i.custom_cards=t,this._config=i,this._fireConfigChanged(i)}_updateCustomCardField(e,t,i){const n=[...this._config.custom_cards||[]];if(!n[e])return;n[e]={...n[e],[t]:i};const o={...this._config,custom_cards:n};this._config=o,this._fireConfigChanged(o)}_updateCustomCardYaml(e,t){const i=[...this._config.custom_cards||[]];if(!i[e])return;const n={...i[e],yaml:t};if(delete n._yaml_error,t.trim())try{const e=rt.load(t);e&&"object"==typeof e?n.parsed_config=e:(n._yaml_error="YAML muss ein Objekt oder Array ergeben",n.parsed_config=void 0)}catch(e){const t=e instanceof Error?e.message.split("\n")[0]:"Ungültiges YAML";n._yaml_error=t||"Ungültiges YAML",n.parsed_config=void 0}else n.parsed_config=void 0;i[e]=n;const o={...this._config,custom_cards:i};this._config=o,this._fireConfigChanged(o)}_addCustomSection(){const e=[...this._config.custom_sections||[]];e.push({key:"",heading:"",yaml:"",parsed_config:void 0});const t={...this._config,custom_sections:e};this._config=t,this._fireConfigChanged(t)}_removeCustomSection(e){const t=[...this._config.custom_sections||[]];t.splice(e,1);const i={...this._config};0===t.length?delete i.custom_sections:i.custom_sections=t,this._config=i,this._fireConfigChanged(i)}_updateCustomSectionField(e,t,i){const n=[...this._config.custom_sections||[]];if(!n[e])return;n[e]={...n[e],[t]:i};const o={...this._config,custom_sections:n};this._config=o,this._fireConfigChanged(o)}_updateCustomSectionYaml(e,t){const i=[...this._config.custom_sections||[]];if(!i[e])return;const n={...i[e],yaml:t};if(delete n._yaml_error,t.trim())try{const e=rt.load(t);Array.isArray(e)?n.parsed_config=e:e&&"object"==typeof e?n.parsed_config=[e]:(n._yaml_error="YAML must produce a card or list of cards",n.parsed_config=void 0)}catch(e){const t=e instanceof Error?e.message.split("\n")[0]:"Invalid YAML";n._yaml_error=t||"Invalid YAML",n.parsed_config=void 0}else n.parsed_config=void 0;i[e]=n;const o={...this._config,custom_sections:i};this._config=o,this._fireConfigChanged(o)}_addCustomBadge(){const e=[...this._config.custom_badges||[]];e.push({yaml:"",parsed_config:void 0});const t={...this._config,custom_badges:e};this._config=t,this._fireConfigChanged(t)}_removeCustomBadge(e){const t=[...this._config.custom_badges||[]];t.splice(e,1);const i={...this._config};0===t.length?delete i.custom_badges:i.custom_badges=t,this._config=i,this._fireConfigChanged(i)}_updateCustomBadgeYaml(e,t){const i=[...this._config.custom_badges||[]];if(!i[e])return;const n={...i[e],yaml:t};if(delete n._yaml_error,t.trim())try{const e=rt.load(t);e&&"object"==typeof e?n.parsed_config=e:(n._yaml_error="YAML muss ein Objekt ergeben",n.parsed_config=void 0)}catch(e){const t=e instanceof Error?e.message.split("\n")[0]:"Ungültiges YAML";n._yaml_error=t||"Ungültiges YAML",n.parsed_config=void 0}else n.parsed_config=void 0;i[e]=n;const o={...this._config,custom_badges:i};this._config=o,this._fireConfigChanged(o)}_areaVisibilityChanged(e,t){if(!this._hass)return;let i=[...this._config.areas_display?.hidden||[]];t?i=i.filter(t=>t!==e):(i.includes(e)||i.push(e),this._expandedAreas.delete(e),this._expandedGroups.delete(e),this._areaEntitiesCache.delete(e));const n={...this._config,areas_display:{...this._config.areas_display,hidden:i}};0===n.areas_display?.hidden?.length&&delete n.areas_display.hidden,n.areas_display&&0===Object.keys(n.areas_display).length&&delete n.areas_display,this._config=n,this._fireConfigChanged(n)}_toggleAreaExpand(e,t){e.stopPropagation();const i=new Set(this._expandedAreas);if(i.has(t)){i.delete(t);const e=new Map(this._expandedGroups);e.delete(t),this._expandedGroups=e}else i.add(t),this._areaEntitiesCache.has(t)||this._loadAreaEntities(t);this._expandedAreas=i}_toggleGroupExpand(e,t){const i=new Map(this._expandedGroups),n=new Set(i.get(e)||[]);n.has(t)?n.delete(t):n.add(t),n.size>0?i.set(e,n):i.delete(e),this._expandedGroups=i}_groupVisibilityChanged(e,t,i,n){if(!this._hass)return;const o=((this._config.areas_options?.[e]||{}).groups_options||{})[t];let r=[...o?.hidden||[]];r=i?r.filter(e=>!n.includes(e)):[...new Set([...r,...n])],this._updateEntityConfig(e,t,r)}_entityVisibilityChanged(e,t,i,n){if(!this._hass)return;if("badges_additional"===t)return void this._badgeAdditionalChanged(e,i,n);if("badges_show_name"===t)return void this._badgeShowNameChanged(e,i,n);const o=((this._config.areas_options?.[e]||{}).groups_options||{})[t];let r=[...o?.hidden||[]];n?r=r.filter(e=>e!==i):r.includes(i)||r.push(i),this._updateEntityConfig(e,t,r)}_updateEntityConfig(e,t,i){const n=this._config.areas_options?.[e]||{},o=n.groups_options||{},r={...o[t],hidden:i};0===r.hidden.length&&delete r.hidden;const a={...o,[t]:r};0===Object.keys(a[t]).length&&delete a[t];const s={...n,groups_options:a};0===Object.keys(s.groups_options).length&&delete s.groups_options;const c={...this._config.areas_options,[e]:s};0===Object.keys(c[e]).length&&delete c[e];const l={...this._config,areas_options:c};l.areas_options&&0===Object.keys(l.areas_options).length&&delete l.areas_options,this._config=l,this._fireConfigChanged(l),this._refreshAreaCache(e)}_badgeAdditionalChanged(e,t,i){if(!this._config)return;const n=this._config.areas_options?.[e]||{},o=n.groups_options||{},r=o.badges||{};let a=[...r.additional||[]];i?a.includes(t)||a.push(t):a=a.filter(e=>e!==t);const s={...r};a.length>0?s.additional=a:delete s.additional;const c={...o,badges:s};0===Object.keys(c.badges).length&&delete c.badges;const l={...n,groups_options:c};0===Object.keys(l.groups_options).length&&delete l.groups_options;const d={...this._config.areas_options,[e]:l};0===Object.keys(d[e]).length&&delete d[e];const p={...this._config,areas_options:d};p.areas_options&&0===Object.keys(p.areas_options).length&&delete p.areas_options,this._config=p,this._fireConfigChanged(p),this._refreshAreaCache(e)}_badgeShowNameChanged(e,t,i){if(!this._config||!this._hass)return;const n=this._config.areas_options?.[e]||{},o=n.groups_options||{},r=o.badges||{};let a=[...r.names_visible||[]],s=[...r.names_hidden||[]];const c=this._hass.states[t],l=c?.attributes?.device_class;i===(0,ct.g7)(l)?(a=a.filter(e=>e!==t),s=s.filter(e=>e!==t)):i?(a.includes(t)||a.push(t),s=s.filter(e=>e!==t)):(a=a.filter(e=>e!==t),s.includes(t)||s.push(t));const d={...r};a.length>0?d.names_visible=a:delete d.names_visible,s.length>0?d.names_hidden=s:delete d.names_hidden;const p={...o,badges:d};0===Object.keys(p.badges).length&&delete p.badges;const u={...n,groups_options:p};0===Object.keys(u.groups_options).length&&delete u.groups_options;const h={...this._config.areas_options,[e]:u};0===Object.keys(h[e]).length&&delete h[e];const g={...this._config,areas_options:h};g.areas_options&&0===Object.keys(g.areas_options).length&&delete g.areas_options,this._config=g,this._fireConfigChanged(g),this._refreshAreaCache(e)}_addBadgeFromPicker(e,t){e.stopPropagation();const i=this.shadowRoot.querySelector(`.badge-entity-picker[data-area-id="${t}"]`);if(!i||!i.value)return;const n=i.value;this._badgeAdditionalChanged(t,n,!0),i.value=""}_getAreaOrder(){if(!this._hass)return[];const e=this._config.areas_display?.order;return e&&e.length>0?[...e]:Object.keys(this._hass.areas||{})}_updateAreaOrder(e){const t={...this._config,areas_display:{...this._config.areas_display,order:e}};this._config=t,this._fireConfigChanged(t)}_fireConfigChanged(e){this._isUpdatingConfig=!0;const t={...e};t.custom_views&&(t.custom_views=t.custom_views.map(e=>{const t={...e};return delete t._yaml_error,t})),t.custom_cards&&(t.custom_cards=t.custom_cards.map(e=>{const t={...e};return delete t._yaml_error,t})),t.custom_badges&&(t.custom_badges=t.custom_badges.map(e=>{const t={...e};return delete t._yaml_error,t})),this._config=t;const i=new CustomEvent("config-changed",{detail:{config:t},bubbles:!0,composed:!0});this.dispatchEvent(i),setTimeout(()=>{this._isUpdatingConfig=!1},0)}},t=new WeakMap,i=new WeakMap,a=new WeakMap,s=new WeakMap,(()=>{const t="function"==typeof Symbol&&Symbol.metadata?Object.create(u[Symbol.metadata]??null):void 0;c=[(0,o.wk)()],l=[(0,o.wk)()],d=[(0,o.wk)()],p=[(0,o.wk)()],yt(e,null,c,{kind:"accessor",name:"_config",static:!1,private:!1,access:{has:e=>"_config"in e,get:e=>e._config,set:(e,t)=>{e._config=t}},metadata:t},h,g),yt(e,null,l,{kind:"accessor",name:"_expandedAreas",static:!1,private:!1,access:{has:e=>"_expandedAreas"in e,get:e=>e._expandedAreas,set:(e,t)=>{e._expandedAreas=t}},metadata:t},_,m),yt(e,null,d,{kind:"accessor",name:"_expandedGroups",static:!1,private:!1,access:{has:e=>"_expandedGroups"in e,get:e=>e._expandedGroups,set:(e,t)=>{e._expandedGroups=t}},metadata:t},f,y),yt(e,null,p,{kind:"accessor",name:"_setupCollapsedOverride",static:!1,private:!1,access:{has:e=>"_setupCollapsedOverride"in e,get:e=>e._setupCollapsedOverride,set:(e,t)=>{e._setupCollapsedOverride=t}},metadata:t},v,b),t&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:t})})(),Object.defineProperty(e,"styles",{enumerable:!0,configurable:!0,writable:!0,value:n.AH`
    /* -- Base layout --------------------------------------------------- */
    .card-config {
      padding: 16px;
      font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
      font-size: var(--mdc-typography-body1-font-size, 14px);
      color: var(--primary-text-color);
    }
    .section {
      margin-bottom: 16px;
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e8e8e8);
      border-radius: var(--ha-card-border-radius, 12px);
      padding: 16px;
      transition: box-shadow 0.2s ease;
    }
    .section-title {
      font-size: 15px;
      font-weight: 500;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--divider-color, #e8e8e8);
      color: var(--primary-text-color);
      letter-spacing: 0.01em;
    }

    /* -- Form rows ----------------------------------------------------- */
    .form-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .form-row input[type="checkbox"],
    .form-row input[type="radio"] {
      margin-right: 8px;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .form-row input[type="checkbox"]:disabled,
    .form-row input[type="radio"]:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .form-row label {
      cursor: pointer;
      user-select: none;
      font-size: 14px;
      color: var(--primary-text-color);
    }
    .form-row label.disabled-label {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .form-row .alarm-select {
      flex: 1;
      max-width: 300px;
    }
    .description {
      font-size: 12px;
      color: var(--secondary-text-color);
      margin: 2px 0 12px 26px;
      line-height: 1.4;
    }
    .description strong {
      font-weight: 600;
      color: var(--primary-text-color);
    }

    /* -- Native <select> — HA-like ------------------------------------- */
    select,
    .form-row select {
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      padding: 10px 32px 10px 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background-color: var(--card-background-color);
      color: var(--primary-text-color);
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%236e6e6e' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      background-size: 16px;
      transition: border-color 0.2s ease;
    }
    select:focus,
    .form-row select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    select:hover,
    .form-row select:hover {
      border-color: var(--primary-color);
    }

    /* -- Native <input type="text/number"> — HA-like ------------------- */
    input[type="text"],
    input[type="number"] {
      font-family: inherit;
      font-size: 14px;
      padding: 10px 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }
    input[type="text"]:focus,
    input[type="number"]:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    input[type="text"]:hover,
    input[type="number"]:hover {
      border-color: var(--primary-color);
    }
    input[type="text"]::placeholder {
      color: var(--secondary-text-color);
      opacity: 0.7;
    }

    /* -- Native <textarea> — YAML editors ------------------------------ */
    textarea {
      font-family: "Roboto Mono", "SFMono-Regular", "Consolas", "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.5;
      padding: 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      resize: vertical;
      min-height: 80px;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
      tab-size: 2;
    }
    textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    textarea:hover {
      border-color: var(--primary-color);
    }
    textarea::placeholder {
      color: var(--secondary-text-color);
      opacity: 0.7;
      font-family: inherit;
    }

    /* -- Buttons — HA-like --------------------------------------------- */
    button {
      font-family: inherit;
      font-size: 14px;
    }
    .btn-primary {
      padding: 10px 20px;
      border-radius: var(--ha-card-border-radius, 12px);
      border: none;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      cursor: pointer;
      font-weight: 500;
      transition: opacity 0.2s ease, box-shadow 0.2s ease;
      white-space: nowrap;
    }
    .btn-primary:hover {
      opacity: 0.85;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    .btn-primary:active {
      opacity: 0.75;
    }
    .btn-remove {
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--secondary-text-color);
      cursor: pointer;
      font-size: 14px;
      transition: color 0.2s ease, border-color 0.2s ease;
      line-height: 1;
    }
    .btn-remove:hover {
      color: var(--error-color, #db4437);
      border-color: var(--error-color, #db4437);
    }

    /* -- Area list ----------------------------------------------------- */
    .area-list {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
    }
    .area-item {
      border-bottom: 1px solid var(--divider-color);
      background: var(--card-background-color);
    }
    .area-item:last-child {
      border-bottom: none;
    }
    .area-item.dragging {
      opacity: 0.5;
    }
    .area-item.drag-over {
      border-top: 2px solid var(--primary-color);
    }
    .area-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
    }
    .drag-handle {
      margin-right: 12px;
      color: var(--secondary-text-color);
      cursor: grab;
      user-select: none;
      padding: 4px;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .area-checkbox {
      margin-right: 12px;
      accent-color: var(--primary-color);
    }
    .area-name {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }
    .area-icon {
      margin-left: 8px;
      margin-right: 12px;
      color: var(--secondary-text-color);
    }
    .expand-button {
      background: none;
      border: none;
      padding: 4px 8px;
      cursor: pointer;
      color: var(--secondary-text-color);
      transition: transform 0.2s;
    }
    .expand-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .expand-button.expanded .expand-icon {
      transform: rotate(90deg);
    }
    .expand-icon {
      display: inline-block;
      transition: transform 0.2s;
    }
    .area-content {
      padding: 0 12px 12px 48px;
      background: var(--secondary-background-color);
    }
    .loading-placeholder {
      padding: 12px;
      text-align: center;
      color: var(--secondary-text-color);
      font-style: italic;
    }

    /* -- Section order list --------------------------------------------- */
    .section-order-list {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
    }
    .section-order-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--card-background-color);
      transition: opacity 0.2s;
    }
    .section-order-item:last-child {
      border-bottom: none;
    }
    .section-order-item.dragging {
      opacity: 0.4;
    }
    .section-order-item.drag-over {
      border-top: 2px solid var(--primary-color);
    }
    .section-order-item.disabled {
      opacity: 0.5;
    }
    .section-order-item .drag-handle {
      margin-right: 12px;
      color: var(--secondary-text-color);
      cursor: grab;
      user-select: none;
      padding: 4px;
    }
    .section-order-item .drag-handle:active {
      cursor: grabbing;
    }
    .section-order-item .section-icon {
      margin-right: 10px;
      color: var(--secondary-text-color);
      --mdc-icon-size: 20px;
    }
    .section-order-item .section-label {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }
    .section-order-item .section-hidden-tag {
      font-size: 12px;
      color: var(--secondary-text-color);
      font-style: italic;
      margin-left: 8px;
    }
    .section-order-item .section-toggle {
      margin-left: auto;
      cursor: pointer;
    }
    .section-order-item .section-toggle input {
      cursor: pointer;
      width: 16px;
      height: 16px;
    }
    .section-order-sub {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px 8px 56px;
      border-bottom: 1px solid var(--divider-color);
      font-size: 13px;
      color: var(--secondary-text-color);
    }
    .section-order-sub input {
      cursor: pointer;
    }
    .section-order-sub label {
      cursor: pointer;
    }

    /* -- Entity groups ------------------------------------------------- */
    .entity-groups {
      padding-top: 8px;
    }
    .entity-group {
      margin-bottom: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
      overflow: hidden;
    }
    .entity-group-header {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease;
    }
    .entity-group-header:hover {
      background: var(--secondary-background-color);
    }
    .group-checkbox {
      margin-right: 8px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .group-checkbox[data-indeterminate="true"] {
      opacity: 0.6;
    }
    .entity-group-header ha-icon {
      margin-right: 8px;
      --mdc-icon-size: 18px;
      color: var(--secondary-text-color);
    }
    .group-name {
      flex: 1;
      font-weight: 500;
      font-size: 14px;
    }
    .entity-count {
      color: var(--secondary-text-color);
      font-size: 12px;
      margin-right: 8px;
    }
    .expand-button-small {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--secondary-text-color);
    }
    .expand-button-small.expanded .expand-icon-small {
      transform: rotate(90deg);
    }
    .expand-icon-small {
      display: inline-block;
      font-size: 12px;
      transition: transform 0.2s;
    }

    /* -- Entity list --------------------------------------------------- */
    .entity-list {
      padding: 8px 12px 8px 36px;
      border-top: 1px solid var(--divider-color);
    }
    .entity-item {
      display: flex;
      align-items: center;
      padding: 6px 0;
    }
    .entity-checkbox {
      margin-right: 8px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .entity-name {
      flex: 1;
      font-size: 14px;
    }
    .entity-id {
      font-size: 11px;
      color: var(--secondary-text-color);
      font-family: "Roboto Mono", monospace;
      margin-left: 8px;
    }
    .empty-state {
      padding: 24px;
      text-align: center;
      color: var(--secondary-text-color);
      font-style: italic;
    }

    /* -- Badge entity management --------------------------------------- */
    .badge-separator {
      padding: 8px 0 4px;
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color);
      border-top: 1px dashed var(--divider-color);
      margin-top: 4px;
    }
    .badge-additional-item {
      padding-left: 0;
    }
    .badge-remove-btn {
      background: none;
      border: none;
      padding: 2px 6px;
      cursor: pointer;
      color: var(--error-color, #db4437);
      font-size: 14px;
      margin-left: 8px;
      border-radius: 4px;
      transition: background-color 0.15s ease;
    }
    .badge-remove-btn:hover {
      background: var(--secondary-background-color);
    }
    .badge-add-section {
      display: flex;
      gap: 8px;
      padding: 8px 0 4px;
      align-items: center;
    }
    .badge-entity-picker {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 13px;
    }
    .badge-add-button {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      transition: opacity 0.2s ease;
    }
    .badge-add-button:hover {
      opacity: 0.85;
    }
    .badge-name-checkbox {
      margin-left: auto;
      margin-right: 2px;
      width: 14px;
      height: 14px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .badge-name-label {
      font-size: 11px;
      color: var(--secondary-text-color);
      margin-right: 8px;
      white-space: nowrap;
    }

    /* -- Entity search picker ------------------------------------------ */
    .entity-search-picker {
      position: relative;
      flex: 1;
      min-width: 0;
    }
    .entity-search-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-family: inherit;
      font-size: 14px;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }
    .entity-search-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    .entity-search-input::placeholder {
      color: var(--secondary-text-color);
      opacity: 0.7;
    }
    .entity-search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 10;
      margin-top: 4px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      max-height: 320px;
      overflow-y: auto;
    }
    .entity-search-result {
      display: flex;
      flex-direction: column;
      padding: 10px 14px;
      cursor: pointer;
      transition: background-color 0.1s ease;
      border-bottom: 1px solid var(--divider-color);
    }
    .entity-search-result:last-child {
      border-bottom: none;
    }
    .entity-search-result:hover {
      background: var(--secondary-background-color);
    }
    .entity-search-result .entity-search-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .entity-search-result .entity-search-id {
      font-size: 11px;
      color: var(--secondary-text-color);
      font-family: "Roboto Mono", monospace;
      margin-top: 2px;
    }
    .entity-search-no-results {
      padding: 12px 14px;
      color: var(--secondary-text-color);
      font-style: italic;
      font-size: 13px;
    }

    /* -- Favorites / Room Pins list items ------------------------------ */
    .entity-list-container {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
    }
    .entity-list-item {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--card-background-color);
      transition: background-color 0.1s ease;
    }
    .entity-list-item:last-child {
      border-bottom: none;
    }
    .entity-list-item:hover {
      background: var(--secondary-background-color);
    }
    .entity-list-item .drag-icon {
      margin-right: 12px;
      color: var(--secondary-text-color);
      font-size: 16px;
      cursor: grab;
      user-select: none;
      padding: 4px;
    }
    .entity-list-item .drag-icon:active {
      cursor: grabbing;
    }
    .entity-list-item.dragging {
      opacity: 0.5;
    }
    .entity-list-item.drag-over {
      border-top: 2px solid var(--primary-color);
    }
    .entity-list-item .item-info {
      flex: 1;
      min-width: 0;
      font-size: 14px;
    }
    .entity-list-item .item-name {
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .entity-list-item .item-entity-id {
      margin-left: 8px;
      font-size: 12px;
      color: var(--secondary-text-color);
      font-family: "Roboto Mono", monospace;
    }
    .entity-list-item .item-area {
      display: block;
      font-size: 11px;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }

    /* -- Custom view/card/badge items ---------------------------------- */
    .custom-item {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      padding: 16px;
      margin-bottom: 12px;
      background: var(--card-background-color);
    }
    .custom-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .custom-item-header strong {
      font-size: 14px;
      font-weight: 500;
    }
    .custom-item-fields {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .custom-card-target {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .custom-card-target label {
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
    .custom-card-target select {
      flex: 1;
      padding: 4px 8px;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 13px;
    }
    .custom-item-row {
      display: flex;
      gap: 8px;
    }
    .custom-item-validation {
      font-size: 12px;
      min-height: 16px;
    }

    /* -- Section dividers ---------------------------------------------- */
    .section-divider {
      margin: 28px 0 12px;
      padding: 0;
    }
    .section-divider-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--secondary-text-color);
    }

    /* -- Mobile responsive --------------------------------------------- */
    @media (max-width: 600px) {
      .card-config {
        padding: 12px 8px;
      }
      .section {
        margin-bottom: 16px;
      }
      .section-title {
        font-size: 15px;
        margin-bottom: 8px;
      }
      .form-row {
        flex-wrap: wrap;
        gap: 4px;
      }
      .form-row label {
        font-size: 13px;
      }
      .description {
        margin-left: 26px;
        margin-bottom: 12px;
        font-size: 11px;
      }

      select,
      .form-row select {
        width: 100%;
        min-width: 0;
        font-size: 13px;
        padding: 8px 28px 8px 10px;
      }
      input[type="text"],
      input[type="number"] {
        width: 100%;
        font-size: 13px;
        padding: 8px 10px;
      }
      textarea {
        font-size: 11px;
        padding: 10px;
        min-height: 60px;
      }

      .entity-search-picker {
        width: 100%;
      }
      .entity-search-results {
        max-height: 240px;
      }
      .entity-search-result {
        padding: 8px 10px;
      }

      .area-header {
        padding: 10px 12px;
      }
      .area-content {
        padding: 0 8px 8px 24px;
      }
      .entity-list {
        padding: 6px 8px 6px 16px;
      }

      .custom-item {
        padding: 12px;
      }
      .custom-item-row {
        flex-direction: column;
      }

      .entity-list-item {
        padding: 8px 10px;
      }
      .entity-list-item .item-entity-id {
        display: block;
        margin-left: 0;
        margin-top: 2px;
      }

      .badge-add-section {
        flex-wrap: wrap;
      }

      .btn-primary {
        padding: 8px 16px;
        font-size: 13px;
      }
    }

    /* -- Setup wizard (v3.1.0) ----------------------------------------- */
    ${(0,n.iz)("\n.setup-panel {\n  background: var(--card-background-color);\n  border: 1px solid var(--divider-color);\n  border-radius: 12px;\n  margin-bottom: 16px;\n  overflow: hidden;\n}\n\n.setup-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 14px 18px;\n  cursor: pointer;\n  user-select: none;\n}\n.setup-header:hover { background: var(--secondary-background-color); }\n\n.setup-header-title {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  font-weight: 600;\n  font-size: 1.05rem;\n}\n.setup-header-stats {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  color: var(--secondary-text-color);\n  font-size: 0.9rem;\n}\n.setup-header-divider { opacity: 0.5; }\n\n.setup-intro {\n  padding: 0 18px 12px;\n  color: var(--secondary-text-color);\n  font-size: 0.9rem;\n  display: flex;\n  justify-content: space-between;\n  align-items: flex-start;\n  gap: 12px;\n}\n.setup-dismiss {\n  background: transparent;\n  border: 1px solid var(--divider-color);\n  color: var(--secondary-text-color);\n  border-radius: 6px;\n  padding: 4px 10px;\n  cursor: pointer;\n  font-size: 0.85rem;\n  white-space: nowrap;\n}\n.setup-dismiss:hover { background: var(--secondary-background-color); }\n\n.setup-category {\n  padding: 6px 18px 14px;\n  border-top: 1px solid var(--divider-color);\n}\n.setup-category-header {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-weight: 600;\n  font-size: 0.85rem;\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n  color: var(--secondary-text-color);\n  padding: 8px 0;\n}\n\n.setup-feature {\n  display: grid;\n  grid-template-columns: auto 1fr auto;\n  gap: 12px;\n  padding: 10px 0;\n  align-items: start;\n  border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 50%, transparent);\n}\n.setup-feature:last-child { border-bottom: none; }\n\n.setup-feature-status {\n  margin-top: 2px;\n  --mdc-icon-size: 22px;\n}\n.setup-feature--active .setup-feature-status { color: var(--success-color, #4caf50); }\n.setup-feature--inactive .setup-feature-status { color: var(--secondary-text-color); }\n.setup-feature--missing .setup-feature-status { color: var(--warning-color, #ff9800); }\n\n.setup-feature-title { font-weight: 500; }\n.setup-feature-desc {\n  color: var(--secondary-text-color);\n  font-size: 0.88rem;\n  margin-top: 2px;\n}\n.setup-feature-detail {\n  color: var(--primary-text-color);\n  font-size: 0.8rem;\n  margin-top: 4px;\n  opacity: 0.75;\n}\n.setup-feature-hacs {\n  margin-top: 6px;\n  font-size: 0.82rem;\n  background: color-mix(in srgb, var(--warning-color, #ff9800) 12%, transparent);\n  border-left: 3px solid var(--warning-color, #ff9800);\n  padding: 6px 10px;\n  border-radius: 4px;\n}\n.setup-feature-hacs a {\n  color: var(--primary-color);\n  text-decoration: underline;\n}\n.setup-feature-action { display: flex; align-items: center; min-width: 60px; justify-content: flex-end; }\n.setup-feature-tag {\n  font-size: 0.75rem;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--secondary-text-color);\n  opacity: 0.7;\n  border: 1px solid var(--divider-color);\n  border-radius: 4px;\n  padding: 2px 6px;\n}\n")}

    /* -- Migration banner (v3.4.3) ------------------------------------- */
    .oriel-migration-banner {
      background: color-mix(in srgb, var(--info-color, #2196f3) 12%, transparent);
      border: 1px solid var(--info-color, #2196f3);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 16px;
    }
    .oriel-migration-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .oriel-migration-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 8px 0;
      border-top: 1px solid color-mix(in srgb, var(--info-color, #2196f3) 30%, transparent);
    }
    .oriel-migration-label { font-weight: 500; }
    .oriel-migration-desc {
      color: var(--secondary-text-color);
      font-size: 0.85rem;
      margin-top: 2px;
    }
    .oriel-migration-apply, .oriel-migration-applyall {
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      cursor: pointer;
      white-space: nowrap;
    }
    .oriel-migration-footer {
      margin-top: 10px;
      display: flex;
      justify-content: flex-end;
    }

    /* -- Usage suggestion banner (v3.5.1) ------------------------------ */
    .oriel-usage-banner {
      background: color-mix(in srgb, var(--accent-color, #ff9800) 12%, transparent);
      border: 1px solid var(--accent-color, #ff9800);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 16px;
    }
    .oriel-usage-title { display: flex; align-items: center; gap: 8px; }
    .oriel-usage-stats { color: var(--secondary-text-color); font-size: 0.85rem; }
    .oriel-usage-body {
      margin: 8px 0;
      color: var(--secondary-text-color);
      font-size: 0.9rem;
    }
    .oriel-usage-order { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
    .oriel-usage-chip {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 0.85rem;
    }
    .oriel-usage-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    .oriel-usage-apply {
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      cursor: pointer;
    }
    .oriel-usage-dismiss {
      background: transparent;
      color: var(--secondary-text-color);
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 6px 14px;
      cursor: pointer;
    }
  `}),Object.defineProperty(e,"_sectionMeta",{enumerable:!0,configurable:!0,writable:!0,value:new Map([["overview",{icon:"mdi:home-outline",labelKey:"sections.overview"}],["custom_cards",{icon:"mdi:cards",labelKey:"sections.custom_cards"}],["areas",{icon:"mdi:floor-plan",labelKey:"sections.areas"}],["weather",{icon:"mdi:weather-partly-cloudy",labelKey:"sections.weather"}],["energy",{icon:"mdi:lightning-bolt",labelKey:"sections.energy"}],["plants",{icon:"mdi:flower-tulip",labelKey:"sections.plants"}],["agenda",{icon:"mdi:calendar",labelKey:"sections.agenda"}],["todos",{icon:"mdi:format-list-checks",labelKey:"sections.todos"}],["persons",{icon:"mdi:account-group",labelKey:"sections.persons"}],["vacuums",{icon:"mdi:robot-vacuum",labelKey:"sections.vacuums"}],["maintenance",{icon:"mdi:update",labelKey:"sections.maintenance"}]])}),Object.defineProperty(e,"_DEVICE_CLASS_DEFAULTS",{enumerable:!0,configurable:!0,writable:!0,value:{temperature:{icon:"mdi:thermometer",round:1},apparent_temperature:{icon:"mdi:thermometer-lines",round:1},humidity:{icon:"mdi:water-percent",round:0},moisture:{icon:"mdi:water-percent",round:0},pressure:{icon:"mdi:gauge",round:0},atmospheric_pressure:{icon:"mdi:gauge",round:0},wind_speed:{icon:"mdi:weather-windy",round:1},wind_direction:{icon:"mdi:compass",round:0},illuminance:{icon:"mdi:brightness-5",round:0},irradiance:{icon:"mdi:weather-sunny",round:0},precipitation:{icon:"mdi:weather-rainy",round:1},precipitation_intensity:{icon:"mdi:weather-pouring",round:1},voc:{icon:"mdi:cloud-outline",round:0},pm25:{icon:"mdi:weather-fog",round:0},pm10:{icon:"mdi:weather-fog",round:0},co2:{icon:"mdi:molecule-co2",round:0},co:{icon:"mdi:molecule-co",round:1},aqi:{icon:"mdi:air-filter",round:0},ozone:{icon:"mdi:cloud-outline",round:0},sulphur_dioxide:{icon:"mdi:cloud-outline",round:0},nitrogen_dioxide:{icon:"mdi:cloud-outline",round:0},nitrogen_monoxide:{icon:"mdi:cloud-outline",round:0},ammonia:{icon:"mdi:cloud-outline",round:0},distance:{icon:"mdi:ruler",round:1},speed:{icon:"mdi:speedometer",round:1},uv_index:{icon:"mdi:weather-sunny-alert",round:1}}}),Object.defineProperty(e,"_ICON_RE",{enumerable:!0,configurable:!0,writable:!0,value:/^[a-z]+:[a-z0-9-]+$/}),e})();function $t(e,t){const i=Object.values(t.devices||{}),n=Object.values(t.entities||{}),o=new Set;for(const t of i)t.area_id===e&&o.add(t.id);const r=[];for(const i of n){let n=!1;if(i.area_id?n=i.area_id===e:i.device_id&&o.has(i.device_id)&&(n=!0),!n)continue;if(i.hidden)continue;if(i.labels?.includes("no_dboard"))continue;const a=t.states[i.entity_id];if(!a)continue;const s=i.entity_id.split(".")[0]??"",c=a.attributes?.device_class,l=a.attributes?.unit_of_measurement;if((0,ct.fF)(s,c,l,i.entity_id)){if("sensor"===s&&("battery"===c||i.entity_id.includes("battery"))){const e=parseFloat(a.state);!isNaN(e)&&e<20&&r.push(i.entity_id);continue}r.push(i.entity_id)}}return r}function Ct(e,t){return t.areas_options?.[e]?.groups_options?.badges?.additional||[]}function kt(e,t,i,n){const o=Object.values(t.devices||{}),r=Object.values(t.entities||{}),a=new Set([...i,...n]),s=new Set;for(const t of o)t.area_id===e&&s.add(t.id);const c=[];for(const i of r){let n=!1;if(i.area_id?n=i.area_id===e:i.device_id&&s.has(i.device_id)&&(n=!0),!n)continue;if(i.hidden)continue;if(!t.states[i.entity_id])continue;const o=i.entity_id.split(".")[0];if("sensor"!==o&&"binary_sensor"!==o)continue;if(a.has(i.entity_id))continue;const r=t.states[i.entity_id];if(!r)continue;const l=r.attributes?.friendly_name||(i.entity_id.split(".")[1]??i.entity_id).replace(/_/g," ");c.push({entity_id:i.entity_id,name:l})}return c.sort((e,t)=>e.name.localeCompare(t.name)),c}function St(e,t){const i=new Set;for(const n of e){const e=t.states[n];if(!e)continue;const o=e.attributes?.device_class;(0,ct.g7)(o)&&i.add(n)}return i}function At(e,t){const i=t.areas_options?.[e]?.groups_options?.badges;return{namesVisible:i?.names_visible||[],namesHidden:i?.names_hidden||[]}}function zt(e,t){const i=t.areas_options?.[e];if(!i||!i.groups_options)return{};const n={};for(const[e,t]of Object.entries(i.groups_options))t.hidden&&(n[e]=t.hidden);return n}function Et(e,t){const i=t.areas_options?.[e];if(!i||!i.groups_options)return{};const n={};for(const[e,t]of Object.entries(i.groups_options))t.order&&(n[e]=t.order);return n}customElements.define("oriel-editor",wt)}}]);