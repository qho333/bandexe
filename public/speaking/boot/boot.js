import { t as e } from "./rolldown-runtime-BzLJeDhJ.js";
import { n as t } from "./i18n-0Dcg7OLR.js";
// node_modules/scheduler/cjs/scheduler.production.js
var n = /* @__PURE__ */ e(((e) => {
	function t(e, t) {
		var n = e.length;
		e.push(t);
		a: for (; 0 < n;) {
			var r = n - 1 >>> 1, a = e[r];
			if (0 < i(a, t)) e[r] = t, e[n] = a, n = r;
			else break a;
		}
	}
	function n(e) {
		return e.length === 0 ? null : e[0];
	}
	function r(e) {
		if (e.length === 0) return null;
		var t = e[0], n = e.pop();
		if (n !== t) {
			e[0] = n;
			a: for (var r = 0, a = e.length, o = a >>> 1; r < o;) {
				var s = 2 * (r + 1) - 1, c = e[s], l = s + 1, u = e[l];
				if (0 > i(c, n)) l < a && 0 > i(u, c) ? (e[r] = u, e[l] = n, r = l) : (e[r] = c, e[s] = n, r = s);
				else if (l < a && 0 > i(u, n)) e[r] = u, e[l] = n, r = l;
				else break a;
			}
		}
		return t;
	}
	function i(e, t) {
		var n = e.sortIndex - t.sortIndex;
		return n === 0 ? e.id - t.id : n;
	}
	if (e.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
		var a = performance;
		e.unstable_now = function() {
			return a.now();
		};
	} else {
		var o = Date, s = o.now();
		e.unstable_now = function() {
			return o.now() - s;
		};
	}
	var c = [], l = [], u = 1, d = null, f = 3, p = !1, m = !1, h = !1, g = !1, _ = typeof setTimeout == "function" ? setTimeout : null, v = typeof clearTimeout == "function" ? clearTimeout : null, y = typeof setImmediate < "u" ? setImmediate : null;
	function b(e) {
		for (var i = n(l); i !== null;) {
			if (i.callback === null) r(l);
			else if (i.startTime <= e) r(l), i.sortIndex = i.expirationTime, t(c, i);
			else break;
			i = n(l);
		}
	}
	function x(e) {
		if (h = !1, b(e), !m) {
			if (n(c) !== null) m = !0, S || (S = !0, O());
			else {
				var t = n(l);
				t !== null && ee(x, t.startTime - e);
			}
		}
	}
	var S = !1, C = -1, w = 5, T = -1;
	function E() {
		return g ? !0 : !(e.unstable_now() - T < w);
	}
	function D() {
		if (g = !1, S) {
			var t = e.unstable_now();
			T = t;
			var i = !0;
			try {
				a: {
					m = !1, h && (h = !1, v(C), C = -1), p = !0;
					var a = f;
					try {
						b: {
							for (b(t), d = n(c); d !== null && !(d.expirationTime > t && E());) {
								var o = d.callback;
								if (typeof o == "function") {
									d.callback = null, f = d.priorityLevel;
									var s = o(d.expirationTime <= t);
									if (t = e.unstable_now(), typeof s == "function") {
										d.callback = s, b(t), i = !0;
										break b;
									}
									d === n(c) && r(c), b(t);
								} else r(c);
								d = n(c);
							}
							if (d !== null) i = !0;
							else {
								var u = n(l);
								u !== null && ee(x, u.startTime - t), i = !1;
							}
						}
						break a;
					} finally {
						d = null, f = a, p = !1;
					}
					i = void 0;
				}
			} finally {
				i ? O() : S = !1;
			}
		}
	}
	var O;
	if (typeof y == "function") O = function() {
		y(D);
	};
	else if (typeof MessageChannel < "u") {
		var k = new MessageChannel(), A = k.port2;
		k.port1.onmessage = D, O = function() {
			A.postMessage(null);
		};
	} else O = function() {
		_(D, 0);
	};
	function ee(t, n) {
		C = _(function() {
			t(e.unstable_now());
		}, n);
	}
	e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(e) {
		e.callback = null;
	}, e.unstable_forceFrameRate = function(e) {
		0 > e || 125 < e ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : w = 0 < e ? Math.floor(1e3 / e) : 5;
	}, e.unstable_getCurrentPriorityLevel = function() {
		return f;
	}, e.unstable_next = function(e) {
		switch (f) {
			case 1:
			case 2:
			case 3:
				var t = 3;
				break;
			default: t = f;
		}
		var n = f;
		f = t;
		try {
			return e();
		} finally {
			f = n;
		}
	}, e.unstable_requestPaint = function() {
		g = !0;
	}, e.unstable_runWithPriority = function(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 3:
			case 4:
			case 5: break;
			default: e = 3;
		}
		var n = f;
		f = e;
		try {
			return t();
		} finally {
			f = n;
		}
	}, e.unstable_scheduleCallback = function(r, i, a) {
		var o = e.unstable_now();
		switch (typeof a == "object" && a ? (a = a.delay, a = typeof a == "number" && 0 < a ? o + a : o) : a = o, r) {
			case 1:
				var s = -1;
				break;
			case 2:
				s = 250;
				break;
			case 5:
				s = 1073741823;
				break;
			case 4:
				s = 1e4;
				break;
			default: s = 5e3;
		}
		return s = a + s, r = {
			id: u++,
			callback: i,
			priorityLevel: r,
			startTime: a,
			expirationTime: s,
			sortIndex: -1
		}, a > o ? (r.sortIndex = a, t(l, r), n(c) === null && r === n(l) && (h ? (v(C), C = -1) : h = !0, ee(x, a - o))) : (r.sortIndex = s, t(c, r), m || p || (m = !0, S || (S = !0, O()))), r;
	}, e.unstable_shouldYield = E, e.unstable_wrapCallback = function(e) {
		var t = f;
		return function() {
			var n = f;
			f = t;
			try {
				return e.apply(this, arguments);
			} finally {
				f = n;
			}
		};
	};
})), r = /* @__PURE__ */ e(((e, t) => {
	t.exports = n();
})), i = /* @__PURE__ */ e(((e) => {
	var n = t();
	function r(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function i() {}
	var a = {
		d: {
			f: i,
			r: function() {
				throw Error(r(522));
			},
			D: i,
			C: i,
			L: i,
			m: i,
			X: i,
			S: i,
			M: i
		},
		p: 0,
		findDOMNode: null
	}, o = Symbol.for("react.portal"), s = Symbol.for("react.recoverable"), c = Symbol.for("react.optimistic_key");
	function l(e, t, n) {
		var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
		return {
			$$typeof: o,
			key: r == null ? null : r === c ? c : "" + r,
			children: e,
			containerInfo: t,
			implementation: n
		};
	}
	var u = n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	function d(e, t) {
		if (e === "font") return "";
		if (typeof t == "string") return t === "use-credentials" ? t : "";
	}
	e.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = a, e.browser = function(e) {
		return {
			$$typeof: s,
			_reason: e
		};
	}, e.createPortal = function(e, t) {
		var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
		if (!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11) throw Error(r(299));
		return l(e, t, null, n);
	}, e.flushSync = function(e) {
		var t = u.T, n = a.p;
		try {
			if (u.T = null, a.p = 2, e) return e();
		} finally {
			u.T = t, a.p = n, a.d.f();
		}
	}, e.preconnect = function(e, t) {
		typeof e == "string" && (t ? (t = t.crossOrigin, t = typeof t == "string" ? t === "use-credentials" ? t : "" : void 0) : t = null, a.d.C(e, t));
	}, e.prefetchDNS = function(e) {
		typeof e == "string" && a.d.D(e);
	}, e.preinit = function(e, t) {
		if (typeof e == "string" && t && typeof t.as == "string") {
			var n = t.as, r = d(n, t.crossOrigin), i = typeof t.integrity == "string" ? t.integrity : void 0, o = typeof t.fetchPriority == "string" ? t.fetchPriority : void 0;
			n === "style" ? a.d.S(e, typeof t.precedence == "string" ? t.precedence : void 0, {
				crossOrigin: r,
				integrity: i,
				fetchPriority: o
			}) : n === "script" && a.d.X(e, {
				crossOrigin: r,
				integrity: i,
				fetchPriority: o,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0
			});
		}
	}, e.preinitModule = function(e, t) {
		if (typeof e == "string") {
			if (typeof t == "object" && t) {
				if (t.as == null || t.as === "script") {
					var n = d(t.as, t.crossOrigin);
					a.d.M(e, {
						crossOrigin: n,
						integrity: typeof t.integrity == "string" ? t.integrity : void 0,
						nonce: typeof t.nonce == "string" ? t.nonce : void 0,
						fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0
					});
				}
			} else t ?? a.d.M(e);
		}
	}, e.preload = function(e, t) {
		if (typeof e == "string" && typeof t == "object" && t && typeof t.as == "string") {
			var n = t.as, r = d(n, t.crossOrigin);
			a.d.L(e, n, {
				crossOrigin: r,
				integrity: typeof t.integrity == "string" ? t.integrity : void 0,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0,
				type: typeof t.type == "string" ? t.type : void 0,
				fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0,
				referrerPolicy: typeof t.referrerPolicy == "string" ? t.referrerPolicy : void 0,
				imageSrcSet: typeof t.imageSrcSet == "string" ? t.imageSrcSet : void 0,
				imageSizes: typeof t.imageSizes == "string" ? t.imageSizes : void 0,
				media: typeof t.media == "string" ? t.media : void 0
			});
		}
	}, e.preloadModule = function(e, t) {
		if (typeof e == "string") {
			if (t) {
				var n = d(t.as, t.crossOrigin);
				a.d.m(e, {
					as: typeof t.as == "string" && t.as !== "script" ? t.as : void 0,
					crossOrigin: n,
					integrity: typeof t.integrity == "string" ? t.integrity : void 0,
					nonce: typeof t.nonce == "string" ? t.nonce : void 0,
					fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0
				});
			} else a.d.m(e);
		}
	}, e.requestFormReset = function(e) {
		a.d.r(e);
	}, e.unstable_batchedUpdates = function(e, t) {
		return e(t);
	}, e.useFormState = function(e, t, n) {
		return u.H.useFormState(e, t, n);
	}, e.useFormStatus = function() {
		return u.H.useHostTransitionStatus();
	}, e.version = "19.3.1";
})), a = /* @__PURE__ */ e(((e, t) => {
	function n() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE == "function") try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = i();
})), o = /* @__PURE__ */ e(((e) => {
	var n = r(), i = t(), o = a();
	function s(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function c(e) {
		return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
	}
	function l(e) {
		for (var t = e, n = t; n && !n.alternate;) t = n, t.flags & 4098 && (e = t.return), n = t.return;
		for (; t.return;) t = t.return;
		return t.tag === 3 ? e : null;
	}
	function u(e) {
		if (e.tag === 13) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function d(e) {
		if (e.tag === 31) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function f(e) {
		if (l(e) !== e) throw Error(s(188));
	}
	function p(e) {
		var t = e.alternate;
		if (!t) {
			if (t = l(e), t === null) throw Error(s(188));
			return t === e ? e : null;
		}
		for (var n = e, r = t;;) {
			var i = n.return;
			if (i === null) break;
			var a = i.alternate;
			if (a === null) {
				if (r = i.return, r !== null) {
					n = r;
					continue;
				}
				break;
			}
			if (i.child === a.child) {
				for (a = i.child; a;) {
					if (a === n) return f(i), e;
					if (a === r) return f(i), t;
					a = a.sibling;
				}
				throw Error(s(188));
			}
			if (n.return !== r.return) n = i, r = a;
			else {
				for (var o = !1, c = i.child; c;) {
					if (c === n) {
						o = !0, n = i, r = a;
						break;
					}
					if (c === r) {
						o = !0, r = i, n = a;
						break;
					}
					c = c.sibling;
				}
				if (!o) {
					for (c = a.child; c;) {
						if (c === n) {
							o = !0, n = a, r = i;
							break;
						}
						if (c === r) {
							o = !0, r = a, n = i;
							break;
						}
						c = c.sibling;
					}
					if (!o) throw Error(s(189));
				}
			}
			if (n.alternate !== r) throw Error(s(190));
		}
		if (n.tag !== 3) throw Error(s(188));
		return n.stateNode.current === n ? e : t;
	}
	function m(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e;
		for (e = e.child; e !== null;) {
			if (t = m(e), t !== null) return t;
			e = e.sibling;
		}
		return null;
	}
	function h(e, t, n, r, i, a) {
		for (; e !== null;) {
			if ((e.tag === 5 || e.tag === 27 || e.tag === 6) && n(e, r, i, a) || (e.tag !== 22 || e.memoizedState === null) && (t || e.tag !== 5 && e.tag !== 27) && h(e.child, t, n, r, i, a)) return !0;
			e = e.sibling;
		}
		return !1;
	}
	function g(e) {
		for (e = e.return; e !== null;) {
			if (e.tag === 3 || e.tag === 5 || e.tag === 27) return e;
			e = e.return;
		}
		return null;
	}
	function _(e) {
		var t = !1;
		for (e = e.return; e !== null && (e.tag === 4 && (t = !0), e.tag !== 3 && e.tag !== 5 && e.tag !== 27);) e = e.return;
		return t;
	}
	function v(e) {
		var t = [null, null], n = g(e);
		return n === null || y(t, e, n.child, { foundSelf: !1 }), t;
	}
	function y(e, t, n, r) {
		for (; n !== null;) {
			if (n === t) r.foundSelf = !0;
			else if (n.tag === 5 || n.tag === 27 || n.tag === 6) {
				if (r.foundSelf) return e[1] = n, !0;
				e[0] = n;
			} else if ((n.tag !== 22 || n.memoizedState === null) && y(e, t, n.child, r)) return !0;
			n = n.sibling;
		}
		return !1;
	}
	function b(e) {
		switch (e.tag) {
			case 5:
			case 27:
			case 6: return e.stateNode;
			case 3: return e.stateNode.containerInfo;
			default: throw Error(s(559));
		}
	}
	var x = null, S = null;
	function C(e, t, n) {
		return e === n || e === t && (x = e, !0);
	}
	function w(e, t, n) {
		return e === n ? (S = e, !1) : e === t && (S !== null && (x = e), !0);
	}
	function T(e) {
		if (e === null) return null;
		do
			e = e === null ? null : e.return;
		while (e && e.tag !== 5 && e.tag !== 27 && e.tag !== 3);
		return e || null;
	}
	function E(e, t, n) {
		for (var r = 0, i = e; i; i = n(i)) r++;
		i = 0;
		for (var a = t; a; a = n(a)) i++;
		for (; 0 < r - i;) e = n(e), r--;
		for (; 0 < i - r;) t = n(t), i--;
		for (; r--;) {
			if (e === t || t !== null && e === t.alternate) return e;
			e = n(e), t = n(t);
		}
		return null;
	}
	var D = Object.assign, O = Symbol.for("react.element"), k = Symbol.for("react.transitional.element"), A = Symbol.for("react.portal"), ee = Symbol.for("react.fragment"), te = Symbol.for("react.strict_mode"), ne = Symbol.for("react.profiler"), j = Symbol.for("react.consumer"), re = Symbol.for("react.context"), ie = Symbol.for("react.forward_ref"), ae = Symbol.for("react.suspense"), oe = Symbol.for("react.suspense_list"), se = Symbol.for("react.memo"), ce = Symbol.for("react.lazy"), le = Symbol.for("react.activity"), ue = Symbol.for("react.legacy_hidden"), de = Symbol.for("react.memo_cache_sentinel"), fe = Symbol.for("react.view_transition"), pe = Symbol.for("react.recoverable"), me = Symbol.iterator;
	function he(e) {
		return typeof e != "object" || !e ? null : (e = me && e[me] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var ge = Symbol.for("react.client.reference");
	function _e(e) {
		if (e == null) return null;
		if (typeof e == "function") return e.$$typeof === ge ? null : e.displayName || e.name || null;
		if (typeof e == "string") return e;
		switch (e) {
			case ee: return "Fragment";
			case ne: return "Profiler";
			case te: return "StrictMode";
			case ae: return "Suspense";
			case oe: return "SuspenseList";
			case le: return "Activity";
			case fe: return "ViewTransition";
		}
		if (typeof e == "object") switch (e.$$typeof) {
			case A: return "Portal";
			case re: return e.displayName || "Context";
			case j: return (e._context.displayName || "Context") + ".Consumer";
			case ie:
				var t = e.render;
				return e = e.displayName, e ||= (e = t.displayName || t.name || "", e === "" ? "ForwardRef" : "ForwardRef(" + e + ")"), e;
			case se: return t = e.displayName || null, t === null ? _e(e.type) || "Memo" : t;
			case ce:
				t = e._payload, e = e._init;
				try {
					return _e(e(t));
				} catch {}
		}
		return null;
	}
	var ve = Array.isArray, M = i.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, N = o.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ye = {
		pending: !1,
		data: null,
		method: null,
		action: null
	}, be = [], xe = -1;
	function Se(e) {
		return { current: e };
	}
	function Ce(e) {
		0 > xe || (e.current = be[xe], be[xe] = null, xe--);
	}
	function P(e, t) {
		xe++, be[xe] = e.current, e.current = t;
	}
	var we = Se(null), Te = Se(null), Ee = Se(null), De = Se(null);
	function Oe(e, t) {
		switch (P(Ee, t), P(Te, e), P(we, null), t.nodeType) {
			case 9:
			case 11:
				e = (e = t.documentElement) && (e = e.namespaceURI) ? up(e) : 0;
				break;
			default: if (e = t.tagName, t = t.namespaceURI) t = up(t), e = dp(t, e);
			else switch (e) {
				case "svg":
					e = 1;
					break;
				case "math":
					e = 2;
					break;
				default: e = 0;
			}
		}
		Ce(we), P(we, e);
	}
	function ke() {
		Ce(we), Ce(Te), Ce(Ee);
	}
	function Ae(e) {
		var t = e.memoizedState;
		t !== null && (sh._currentValue = t.memoizedState, P(De, e)), t = we.current;
		var n = dp(t, e.type);
		t !== n && (P(Te, e), P(we, n));
	}
	function je(e) {
		Te.current === e && (Ce(we), Ce(Te)), De.current === e && (Ce(De), sh._currentValue = ye);
	}
	var Me, Ne;
	function Pe(e) {
		if (Me === void 0) try {
			throw Error();
		} catch (e) {
			var t = e.stack.trim().match(/\n( *(at )?)/);
			Me = t && t[1] || "", Ne = -1 < e.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < e.stack.indexOf("@") ? "@unknown:0:0" : "";
		}
		return "\n" + Me + e + Ne;
	}
	var Fe = !1;
	function Ie(e, t) {
		if (!e || Fe) return "";
		Fe = !0;
		var n = Error.prepareStackTrace;
		Error.prepareStackTrace = void 0;
		try {
			var r = { DetermineComponentFrameRoot: function() {
				try {
					if (t) {
						var n = function() {
							throw Error();
						};
						if (Object.defineProperty(n.prototype, "props", { set: function() {
							throw Error();
						} }), typeof Reflect == "object" && Reflect.construct) {
							try {
								Reflect.construct(n, []);
							} catch (e) {
								var r = e;
							}
							Reflect.construct(e, [], n);
						} else {
							try {
								n.call();
							} catch (e) {
								r = e;
							}
							n = !1;
							try {
								var i = Object.getOwnPropertyDescriptor(e.prototype, "props");
								Object.defineProperty(e.prototype, "props", {
									configurable: !0,
									set: function() {
										throw Error();
									}
								}), n = !0, new e();
							} finally {
								n && (i === void 0 ? delete e.prototype.props : Object.defineProperty(e.prototype, "props", i));
							}
						}
					} else {
						try {
							throw Error();
						} catch (e) {
							r = e;
						}
						(n = e()) && typeof n.catch == "function" && n.catch(function() {});
					}
				} catch (e) {
					if (e && r && typeof e.stack == "string") return [e.stack, r.stack];
				}
				return [null, null];
			} };
			r.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
			var i = Object.getOwnPropertyDescriptor(r.DetermineComponentFrameRoot, "name");
			i && i.configurable && Object.defineProperty(r.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
			var a = r.DetermineComponentFrameRoot(), o = a[0], s = a[1];
			if (o && s) {
				var c = o.split("\n"), l = s.split("\n");
				for (i = r = 0; r < c.length && !c[r].includes("DetermineComponentFrameRoot");) r++;
				for (; i < l.length && !l[i].includes("DetermineComponentFrameRoot");) i++;
				if (r === c.length || i === l.length) for (r = c.length - 1, i = l.length - 1; 1 <= r && 0 <= i && c[r] !== l[i];) i--;
				for (; 1 <= r && 0 <= i; r--, i--) if (c[r] !== l[i]) {
					if (r !== 1 || i !== 1) do
						if (r--, i--, 0 > i || c[r] !== l[i]) {
							var u = "\n" + c[r].replace(" at new ", " at ");
							return e.displayName && u.includes("<anonymous>") && (u = u.replace("<anonymous>", e.displayName)), u;
						}
					while (1 <= r && 0 <= i);
					break;
				}
			}
		} finally {
			Fe = !1, Error.prepareStackTrace = n;
		}
		return (n = e ? e.displayName || e.name : "") ? Pe(n) : "";
	}
	function Le(e, t) {
		switch (e.tag) {
			case 26:
			case 27:
			case 5: return Pe(e.type);
			case 16: return Pe("Lazy");
			case 13: return e.child !== t && t !== null ? Pe("Suspense Fallback") : Pe("Suspense");
			case 19: return Pe("SuspenseList");
			case 0:
			case 15: return Ie(e.type, !1);
			case 11: return Ie(e.type.render, !1);
			case 1: return Ie(e.type, !0);
			case 31: return Pe("Activity");
			case 30: return Pe("ViewTransition");
			default: return "";
		}
	}
	function Re(e) {
		try {
			var t = "", n = null;
			do
				t += Le(e, n), n = e, e = e.return;
			while (e);
			return t;
		} catch (e) {
			return "\nError generating stack: " + e.message + "\n" + e.stack;
		}
	}
	var ze = Object.prototype.hasOwnProperty, Be = n.unstable_scheduleCallback, Ve = n.unstable_cancelCallback, He = n.unstable_shouldYield, Ue = n.unstable_requestPaint, We = n.unstable_now, Ge = n.unstable_getCurrentPriorityLevel, Ke = n.unstable_ImmediatePriority, qe = n.unstable_UserBlockingPriority, Je = n.unstable_NormalPriority, Ye = n.unstable_LowPriority, Xe = n.unstable_IdlePriority, Ze = n.log, Qe = n.unstable_setDisableYieldValue, $e = null, et = null;
	function tt(e) {
		if (typeof Ze == "function" && Qe(e), et && typeof et.setStrictMode == "function") try {
			et.setStrictMode($e, e);
		} catch {}
	}
	var nt = Math.clz32 ? Math.clz32 : at, rt = Math.log, it = Math.LN2;
	function at(e) {
		return e >>>= 0, e === 0 ? 32 : 31 - (rt(e) / it | 0) | 0;
	}
	var ot = 256, st = 262144, ct = 4194304;
	function lt(e) {
		var t = e & 42;
		if (t !== 0) return t;
		switch (e & -e) {
			case 1: return 1;
			case 2: return 2;
			case 4: return 4;
			case 8: return 8;
			case 16: return 16;
			case 32: return 32;
			case 64: return 64;
			case 128: return 128;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072: return e & -e;
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return e & 3932160;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return e & 62914560;
			case 67108864: return 67108864;
			case 134217728: return 134217728;
			case 268435456: return 268435456;
			case 536870912: return 536870912;
			case 1073741824: return 0;
			default: return e;
		}
	}
	function ut(e, t, n) {
		var r = e.pendingLanes;
		if (r === 0) return 0;
		var i = 0, a = e.suspendedLanes, o = e.pingedLanes;
		e = e.warmLanes;
		var s = r & 134217727;
		return s === 0 ? (s = r & ~a, s === 0 ? o === 0 ? n || (n = r & ~e, n !== 0 && (i = lt(n))) : i = lt(o) : i = lt(s)) : (r = s & ~a, r === 0 ? (o &= s, o === 0 ? n || (n = s & ~e, n !== 0 && (i = lt(n))) : i = lt(o)) : i = lt(r)), i === 0 ? 0 : t !== 0 && t !== i && (t & a) === 0 && (a = i & -i, n = t & -t, a >= n || a === 32 && n & 4194048) ? t : i;
	}
	function dt(e, t) {
		return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
	}
	function ft(e, t) {
		t & 8 && (t |= t & 32);
		var n = e.entangledLanes;
		if (n !== 0) for (e = e.entanglements, n &= t; 0 < n;) {
			var r = 31 - nt(n), i = 1 << r;
			t |= e[r], n &= ~i;
		}
		return t;
	}
	function pt(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 4:
			case 8:
			case 64: return t + 250;
			case 16:
			case 32:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return t + 5e3;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return -1;
			case 67108864:
			case 134217728:
			case 268435456:
			case 536870912:
			case 1073741824: return -1;
			default: return -1;
		}
	}
	function mt() {
		var e = ct;
		return ct <<= 1, !(ct & 62914560) && (ct = 4194304), e;
	}
	function ht(e) {
		for (var t = [], n = 0; 31 > n; n++) t.push(e);
		return t;
	}
	function gt(e, t) {
		e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
	}
	function _t(e, t, n, r, i, a) {
		var o = e.pendingLanes;
		e.pendingLanes = n, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= n, e.entangledLanes &= n, e.errorRecoveryDisabledLanes &= n, e.shellSuspendCounter = 0;
		var s = e.entanglements, c = e.expirationTimes, l = e.hiddenUpdates;
		for (n = o & ~n; 0 < n;) {
			var u = 31 - nt(n), d = 1 << u;
			s[u] = 0, c[u] = -1;
			var f = l[u];
			if (f !== null) for (l[u] = null, u = 0; u < f.length; u++) {
				var p = f[u];
				p !== null && (p.lane &= -536870913);
			}
			n &= ~d;
		}
		r !== 0 && vt(e, r, 0), a !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= a & ~(o & ~t));
	}
	function vt(e, t, n) {
		e.pendingLanes |= t, e.suspendedLanes &= ~t;
		var r = 31 - nt(t);
		e.entangledLanes |= t, e.entanglements[r] = e.entanglements[r] | 1073741824 | n & 261930;
	}
	function yt(e, t) {
		var n = e.entangledLanes |= t;
		for (e = e.entanglements; n;) {
			var r = 31 - nt(n), i = 1 << r;
			i & t | e[r] & t && (e[r] |= t), n &= ~i;
		}
	}
	function bt(e, t) {
		var n = t & -t;
		return n = n & 42 ? 1 : xt(n), (n & (e.suspendedLanes | t)) === 0 ? n : 0;
	}
	function xt(e) {
		switch (e) {
			case 2:
				e = 1;
				break;
			case 8:
				e = 4;
				break;
			case 32:
				e = 16;
				break;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
				e = 128;
				break;
			case 268435456:
				e = 134217728;
				break;
			default: e = 0;
		}
		return e;
	}
	function St(e) {
		return e &= -e, 2 < e ? 8 < e ? e & 134217727 ? 32 : 268435456 : 8 : 2;
	}
	function Ct() {
		var e = N.p;
		return e === 0 ? (e = window.event, e === void 0 ? 32 : Ch(e.type)) : e;
	}
	function wt(e, t) {
		var n = N.p;
		try {
			return N.p = e, t();
		} finally {
			N.p = n;
		}
	}
	var Tt = Math.random().toString(36).slice(2), F = "__reactFiber$" + Tt, Et = "__reactProps$" + Tt, Dt = "__reactContainer$" + Tt, Ot = "__reactEvents$" + Tt, kt = "__reactListeners$" + Tt, At = "__reactHandles$" + Tt, jt = "__reactResources$" + Tt, Mt = "__reactMarker$" + Tt, Nt = "__reactLoad$" + Tt;
	function Pt(e) {
		delete e[F], delete e[Et], delete e[kt], delete e[At];
	}
	function Ft(e) {
		var t;
		if (t = e[F]) return t;
		for (var n = e.parentNode; n;) {
			if (t = n[Dt] || n[F]) {
				if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = fm(e); e !== null;) {
					if (n = e[F]) return n;
					e = fm(e);
				}
				return t;
			}
			e = n, n = e.parentNode;
		}
		return null;
	}
	function It(e) {
		if (e = e[F] || e[Dt]) {
			var t = e.tag;
			if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3) return e;
		}
		return null;
	}
	function Lt(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
		throw Error(s(33));
	}
	function Rt(e) {
		var t = e[jt];
		return t ||= e[jt] = {
			hoistableStyles: /* @__PURE__ */ new Map(),
			hoistableScripts: /* @__PURE__ */ new Map()
		}, t;
	}
	function zt(e) {
		e[Mt] = !0;
	}
	function Bt(e) {
		e[Nt] = void 0;
	}
	var Vt = /* @__PURE__ */ new Set(), Ht = {};
	function Ut(e, t) {
		Wt(e, t), Wt(e + "Capture", t);
	}
	function Wt(e, t) {
		for (Ht[e] = t, e = 0; e < t.length; e++) Vt.add(t[e]);
	}
	var Gt = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), Kt = {}, qt = {};
	function Jt(e) {
		return ze.call(qt, e) ? !0 : ze.call(Kt, e) ? !1 : Gt.test(e) ? qt[e] = !0 : (Kt[e] = !0, !1);
	}
	var I = !1;
	function Yt() {
		var e = I;
		return I = !1, e;
	}
	function Xt(e, t, n) {
		if (Jt(t)) {
			if (n === null) e.removeAttribute(t);
			else {
				switch (typeof n) {
					case "undefined":
					case "function":
					case "symbol":
						e.removeAttribute(t);
						return;
					case "boolean":
						var r = t.toLowerCase().slice(0, 5);
						if (r !== "data-" && r !== "aria-") {
							e.removeAttribute(t);
							return;
						}
				}
				e.setAttribute(t, n);
			}
		}
	}
	function L(e, t, n) {
		if (n === null) e.removeAttribute(t);
		else {
			switch (typeof n) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(t);
					return;
			}
			e.setAttribute(t, n);
		}
	}
	function Zt(e, t, n, r) {
		if (r === null) e.removeAttribute(n);
		else {
			switch (typeof r) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(n);
					return;
			}
			e.setAttributeNS(t, n, r);
		}
	}
	function Qt(e) {
		switch (typeof e) {
			case "bigint":
			case "boolean":
			case "number":
			case "string":
			case "undefined": return e;
			case "object": return e;
			default: return "";
		}
	}
	function $t(e) {
		var t = e.type;
		return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
	}
	function en(e, t, n) {
		var r = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
		if (!e.hasOwnProperty(t) && r !== void 0 && typeof r.get == "function" && typeof r.set == "function") {
			var i = r.get, a = r.set;
			return Object.defineProperty(e, t, {
				configurable: !0,
				get: function() {
					return i.call(this);
				},
				set: function(e) {
					n = "" + e, a.call(this, e);
				}
			}), Object.defineProperty(e, t, { enumerable: r.enumerable }), {
				getValue: function() {
					return n;
				},
				setValue: function(e) {
					n = "" + e;
				},
				stopTracking: function() {
					e._valueTracker = null, delete e[t];
				}
			};
		}
	}
	function tn(e) {
		if (!e._valueTracker) {
			var t = $t(e) ? "checked" : "value";
			e._valueTracker = en(e, t, "" + e[t]);
		}
	}
	function nn(e) {
		if (!e) return !1;
		var t = e._valueTracker;
		if (!t) return !0;
		var n = t.getValue(), r = "";
		return e && (r = $t(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n && (t.setValue(e), !0);
	}
	var rn = /[\n"\\]/g;
	function an(e) {
		return e.replace(rn, function(e) {
			return "\\" + e.charCodeAt(0).toString(16) + " ";
		});
	}
	function on(e, t, n, r, i, a, o, s) {
		e.name = "", o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" ? e.type = o : e.removeAttribute("type"), t == null ? o !== "submit" && o !== "reset" || e.removeAttribute("value") : o === "number" ? (t === 0 && e.value === "" || e.value != t) && (e.value = "" + Qt(t)) : e.value !== "" + Qt(t) && (e.value = "" + Qt(t)), t == null ? n == null ? r != null && e.removeAttribute("value") : cn(e, Qt(n)) : o === "number" && e.value == t ? cn(e, Qt(e.value)) : cn(e, Qt(t)), i == null && a != null && (e.defaultChecked = !!a), i != null && (e.checked = i && typeof i != "function" && typeof i != "symbol"), s != null && typeof s != "function" && typeof s != "symbol" && typeof s != "boolean" ? e.name = "" + Qt(s) : e.removeAttribute("name");
	}
	function sn(e, t, n, r, i, a, o, s) {
		if (a != null && typeof a != "function" && typeof a != "symbol" && typeof a != "boolean" && (e.type = a), t != null || n != null) {
			if (!(a !== "submit" && a !== "reset" || t != null)) {
				tn(e);
				return;
			}
			n = n == null ? "" : "" + Qt(n), t = t == null ? n : "" + Qt(t), s || t === e.value || (e.value = t), e.defaultValue = t;
		}
		r ??= i, r = typeof r != "function" && typeof r != "symbol" && !!r, e.checked = s ? e.checked : !!r, e.defaultChecked = !!r, o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" && (e.name = o), tn(e);
	}
	function cn(e, t) {
		e.defaultValue !== "" + t && (e.defaultValue = "" + t);
	}
	function R(e, t, n, r) {
		if (e = e.options, t) {
			t = {};
			for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
			for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
		} else {
			for (n = "" + Qt(n), t = null, i = 0; i < e.length; i++) {
				if (e[i].value === n) {
					e[i].selected = !0, r && (e[i].defaultSelected = !0);
					return;
				}
				t !== null || e[i].disabled || (t = e[i]);
			}
			t !== null && (t.selected = !0);
		}
	}
	function ln(e, t, n) {
		t != null && (t = "" + Qt(t), t !== e.value && (e.value = t), n == null) ? e.defaultValue !== t && (e.defaultValue = t) : e.defaultValue = n == null ? "" : "" + Qt(n);
	}
	function un(e, t, n, r) {
		if (t == null) {
			if (r != null) {
				if (n != null) throw Error(s(92));
				if (ve(r)) {
					if (1 < r.length) throw Error(s(93));
					r = r[0];
				}
				n = r;
			}
			n ??= "", t = n;
		}
		n = Qt(t), e.defaultValue = n, r = e.textContent, r === n && r !== "" && r !== null && (e.value = r), tn(e);
	}
	function dn(e, t) {
		if (t) {
			var n = e.firstChild;
			if (n && n === e.lastChild && n.nodeType === 3) {
				n.nodeValue = t;
				return;
			}
		}
		e.textContent = t;
	}
	var fn = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
	function pn(e, t, n) {
		var r = t.indexOf("--") === 0;
		n == null || typeof n == "boolean" || n === "" ? r ? e.setProperty(t, "") : t === "float" ? e.cssFloat = "" : e[t] = "" : r ? e.setProperty(t, n) : typeof n != "number" || n === 0 || fn.has(t) ? t === "float" ? e.cssFloat = n : e[t] = ("" + n).trim() : e[t] = n + "px";
	}
	function mn(e, t, n) {
		if (t != null && typeof t != "object") throw Error(s(62));
		if (e = e.style, n != null) {
			for (var r in n) !n.hasOwnProperty(r) || t != null && t.hasOwnProperty(r) || (r.indexOf("--") === 0 ? e.setProperty(r, "") : r === "float" ? e.cssFloat = "" : e[r] = "", I = !0);
			for (var i in t) r = t[i], t.hasOwnProperty(i) && n[i] !== r && (pn(e, i, r), I = !0);
		} else for (var a in t) t.hasOwnProperty(a) && pn(e, a, t[a]);
	}
	function hn(e) {
		if (e.indexOf("-") === -1) return !1;
		switch (e) {
			case "annotation-xml":
			case "color-profile":
			case "font-face":
			case "font-face-src":
			case "font-face-uri":
			case "font-face-format":
			case "font-face-name":
			case "missing-glyph": return !1;
			default: return !0;
		}
	}
	var gn = /* @__PURE__ */ new Map([
		["acceptCharset", "accept-charset"],
		["htmlFor", "for"],
		["httpEquiv", "http-equiv"],
		["crossOrigin", "crossorigin"],
		["accentHeight", "accent-height"],
		["alignmentBaseline", "alignment-baseline"],
		["arabicForm", "arabic-form"],
		["baselineShift", "baseline-shift"],
		["capHeight", "cap-height"],
		["clipPath", "clip-path"],
		["clipRule", "clip-rule"],
		["colorInterpolation", "color-interpolation"],
		["colorInterpolationFilters", "color-interpolation-filters"],
		["colorProfile", "color-profile"],
		["colorRendering", "color-rendering"],
		["dominantBaseline", "dominant-baseline"],
		["enableBackground", "enable-background"],
		["fillOpacity", "fill-opacity"],
		["fillRule", "fill-rule"],
		["floodColor", "flood-color"],
		["floodOpacity", "flood-opacity"],
		["fontFamily", "font-family"],
		["fontSize", "font-size"],
		["fontSizeAdjust", "font-size-adjust"],
		["fontStretch", "font-stretch"],
		["fontStyle", "font-style"],
		["fontVariant", "font-variant"],
		["fontWeight", "font-weight"],
		["glyphName", "glyph-name"],
		["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
		["glyphOrientationVertical", "glyph-orientation-vertical"],
		["horizAdvX", "horiz-adv-x"],
		["horizOriginX", "horiz-origin-x"],
		["imageRendering", "image-rendering"],
		["letterSpacing", "letter-spacing"],
		["lightingColor", "lighting-color"],
		["markerEnd", "marker-end"],
		["markerMid", "marker-mid"],
		["markerStart", "marker-start"],
		["maskType", "mask-type"],
		["overlinePosition", "overline-position"],
		["overlineThickness", "overline-thickness"],
		["paintOrder", "paint-order"],
		["panose-1", "panose-1"],
		["pointerEvents", "pointer-events"],
		["renderingIntent", "rendering-intent"],
		["shapeRendering", "shape-rendering"],
		["stopColor", "stop-color"],
		["stopOpacity", "stop-opacity"],
		["strikethroughPosition", "strikethrough-position"],
		["strikethroughThickness", "strikethrough-thickness"],
		["strokeDasharray", "stroke-dasharray"],
		["strokeDashoffset", "stroke-dashoffset"],
		["strokeLinecap", "stroke-linecap"],
		["strokeLinejoin", "stroke-linejoin"],
		["strokeMiterlimit", "stroke-miterlimit"],
		["strokeOpacity", "stroke-opacity"],
		["strokeWidth", "stroke-width"],
		["textAnchor", "text-anchor"],
		["textDecoration", "text-decoration"],
		["textRendering", "text-rendering"],
		["transformOrigin", "transform-origin"],
		["underlinePosition", "underline-position"],
		["underlineThickness", "underline-thickness"],
		["unicodeBidi", "unicode-bidi"],
		["unicodeRange", "unicode-range"],
		["unitsPerEm", "units-per-em"],
		["vAlphabetic", "v-alphabetic"],
		["vHanging", "v-hanging"],
		["vIdeographic", "v-ideographic"],
		["vMathematical", "v-mathematical"],
		["vectorEffect", "vector-effect"],
		["vertAdvY", "vert-adv-y"],
		["vertOriginX", "vert-origin-x"],
		["vertOriginY", "vert-origin-y"],
		["wordSpacing", "word-spacing"],
		["writingMode", "writing-mode"],
		["xmlnsXlink", "xmlns:xlink"],
		["xHeight", "x-height"]
	]), _n = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
	function vn(e) {
		return _n.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e;
	}
	function yn() {}
	var bn = null;
	function xn(e) {
		return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
	}
	var Sn = null, Cn = null;
	function wn(e) {
		var t = It(e);
		if (t && (e = t.stateNode)) {
			var n = e[Et] || null;
			a: switch (e = t.stateNode, t.type) {
				case "input":
					if (on(e, n.value, n.defaultValue, n.defaultValue, n.checked, n.defaultChecked, n.type, n.name), t = n.name, n.type === "radio" && t != null) {
						for (n = e; n.parentNode;) n = n.parentNode;
						for (n = n.querySelectorAll("input[name=\"" + an("" + t) + "\"][type=\"radio\"]"), t = 0; t < n.length; t++) {
							var r = n[t];
							if (r !== e && r.form === e.form) {
								var i = r[Et] || null;
								if (!i) throw Error(s(90));
								on(r, i.value, i.defaultValue, i.defaultValue, i.checked, i.defaultChecked, i.type, i.name);
							}
						}
						for (t = 0; t < n.length; t++) r = n[t], r.form === e.form && nn(r);
					}
					break a;
				case "textarea":
					ln(e, n.value, n.defaultValue);
					break a;
				case "select": t = n.value, t != null && R(e, !!n.multiple, t, !1);
			}
		}
	}
	var Tn = !1;
	function En(e, t, n) {
		if (Tn) return e(t, n);
		Tn = !0;
		try {
			return e(t);
		} finally {
			if (Tn = !1, (Sn !== null || Cn !== null) && (zd(), Sn && (t = Sn, e = Cn, Cn = Sn = null, wn(t), e))) for (t = 0; t < e.length; t++) wn(e[t]);
		}
	}
	function Dn(e, t) {
		var n = e.stateNode;
		if (n === null) return null;
		var r = n[Et] || null;
		if (r === null) return null;
		n = r[t];
		a: switch (t) {
			case "onClick":
			case "onClickCapture":
			case "onDoubleClick":
			case "onDoubleClickCapture":
			case "onMouseDown":
			case "onMouseDownCapture":
			case "onMouseMove":
			case "onMouseMoveCapture":
			case "onMouseUp":
			case "onMouseUpCapture":
			case "onMouseEnter":
				(r = !r.disabled) || (e = e.type, r = e !== "button" && e !== "input" && e !== "select" && e !== "textarea"), e = !r;
				break a;
			default: e = !1;
		}
		if (e) return null;
		if (n && typeof n != "function") throw Error(s(231, t, typeof n));
		return n;
	}
	var On = typeof window < "u" && window.document !== void 0 && window.document.createElement !== void 0, kn = !1;
	if (On) try {
		var An = {};
		Object.defineProperty(An, "passive", { get: function() {
			kn = !0;
		} }), window.addEventListener("test", An, An), window.removeEventListener("test", An, An);
	} catch {
		kn = !1;
	}
	var jn = null, Mn = null, Nn = null;
	function Pn() {
		if (Nn) return Nn;
		var e, t = Mn, n = t.length, r, i = "value" in jn ? jn.value : jn.textContent, a = i.length;
		for (e = 0; e < n && t[e] === i[e]; e++);
		var o = n - e;
		for (r = 1; r <= o && t[n - r] === i[a - r]; r++);
		return Nn = i.slice(e, 1 < r ? 1 - r : void 0);
	}
	function Fn(e) {
		var t = e.keyCode;
		return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
	}
	function In() {
		return !0;
	}
	function Ln() {
		return !1;
	}
	function Rn(e) {
		function t(t, n, r, i, a) {
			for (var o in this._reactName = t, this._targetInst = r, this.type = n, this.nativeEvent = i, this.target = a, this.currentTarget = null, e) e.hasOwnProperty(o) && (t = e[o], this[o] = t ? t(i) : i[o]);
			return this.isDefaultPrevented = (i.defaultPrevented == null ? !1 === i.returnValue : i.defaultPrevented) ? In : Ln, this.isPropagationStopped = Ln, this;
		}
		return D(t.prototype, {
			preventDefault: function() {
				this.defaultPrevented = !0;
				var e = this.nativeEvent;
				e && (e.preventDefault ? e.preventDefault() : typeof e.returnValue != "unknown" && (e.returnValue = !1), this.isDefaultPrevented = In);
			},
			stopPropagation: function() {
				var e = this.nativeEvent;
				e && (e.stopPropagation ? e.stopPropagation() : typeof e.cancelBubble != "unknown" && (e.cancelBubble = !0), this.isPropagationStopped = In);
			},
			persist: function() {},
			isPersistent: In
		}), t;
	}
	var zn = {
		eventPhase: 0,
		bubbles: 0,
		cancelable: 0,
		timeStamp: function(e) {
			return e.timeStamp || Date.now();
		},
		defaultPrevented: 0,
		isTrusted: 0
	}, Bn = Rn(zn), Vn = D({}, zn, {
		view: 0,
		detail: 0
	}), Hn = Rn(Vn), Un, Wn, Gn, Kn = D({}, Vn, {
		screenX: 0,
		screenY: 0,
		clientX: 0,
		clientY: 0,
		pageX: 0,
		pageY: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		getModifierState: rr,
		button: 0,
		buttons: 0,
		relatedTarget: function(e) {
			return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
		},
		movementX: function(e) {
			return "movementX" in e ? e.movementX : (e !== Gn && (Gn && e.type === "mousemove" ? (Un = e.screenX - Gn.screenX, Wn = e.screenY - Gn.screenY) : Wn = Un = 0, Gn = e), Un);
		},
		movementY: function(e) {
			return "movementY" in e ? e.movementY : Wn;
		}
	}), qn = Rn(Kn), Jn = Rn(D({}, Kn, { dataTransfer: 0 })), Yn = Rn(D({}, Vn, { relatedTarget: 0 })), Xn = Rn(D({}, zn, {
		animationName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), Zn = Rn(D({}, zn, { clipboardData: function(e) {
		return "clipboardData" in e ? e.clipboardData : window.clipboardData;
	} })), Qn = Rn(D({}, zn, { data: 0 })), $n = {
		Esc: "Escape",
		Spacebar: " ",
		Left: "ArrowLeft",
		Up: "ArrowUp",
		Right: "ArrowRight",
		Down: "ArrowDown",
		Del: "Delete",
		Win: "OS",
		Menu: "ContextMenu",
		Apps: "ContextMenu",
		Scroll: "ScrollLock",
		MozPrintableKey: "Unidentified"
	}, er = {
		8: "Backspace",
		9: "Tab",
		12: "Clear",
		13: "Enter",
		16: "Shift",
		17: "Control",
		18: "Alt",
		19: "Pause",
		20: "CapsLock",
		27: "Escape",
		32: " ",
		33: "PageUp",
		34: "PageDown",
		35: "End",
		36: "Home",
		37: "ArrowLeft",
		38: "ArrowUp",
		39: "ArrowRight",
		40: "ArrowDown",
		45: "Insert",
		46: "Delete",
		112: "F1",
		113: "F2",
		114: "F3",
		115: "F4",
		116: "F5",
		117: "F6",
		118: "F7",
		119: "F8",
		120: "F9",
		121: "F10",
		122: "F11",
		123: "F12",
		144: "NumLock",
		145: "ScrollLock",
		224: "Meta"
	}, tr = {
		Alt: "altKey",
		Control: "ctrlKey",
		Meta: "metaKey",
		Shift: "shiftKey"
	};
	function nr(e) {
		var t = this.nativeEvent;
		return t.getModifierState ? t.getModifierState(e) : (e = tr[e]) ? !!t[e] : !1;
	}
	function rr() {
		return nr;
	}
	var ir = Rn(D({}, Vn, {
		key: function(e) {
			if (e.key) {
				var t = $n[e.key] || e.key;
				if (t !== "Unidentified") return t;
			}
			return e.type === "keypress" ? (e = Fn(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? er[e.keyCode] || "Unidentified" : "";
		},
		code: 0,
		location: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		repeat: 0,
		locale: 0,
		getModifierState: rr,
		charCode: function(e) {
			return e.type === "keypress" ? Fn(e) : 0;
		},
		keyCode: function(e) {
			return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		},
		which: function(e) {
			return e.type === "keypress" ? Fn(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		}
	})), ar = Rn(D({}, Kn, {
		pointerId: 0,
		width: 0,
		height: 0,
		pressure: 0,
		tangentialPressure: 0,
		tiltX: 0,
		tiltY: 0,
		twist: 0,
		pointerType: 0,
		isPrimary: 0
	})), or = Rn(D({}, zn, { submitter: 0 })), sr = Rn(D({}, Vn, {
		touches: 0,
		targetTouches: 0,
		changedTouches: 0,
		altKey: 0,
		metaKey: 0,
		ctrlKey: 0,
		shiftKey: 0,
		getModifierState: rr
	})), cr = Rn(D({}, zn, {
		propertyName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), lr = Rn(D({}, Kn, {
		deltaX: function(e) {
			return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
		},
		deltaY: function(e) {
			return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
		},
		deltaZ: 0,
		deltaMode: 0
	})), ur = Rn(D({}, zn, {
		newState: 0,
		oldState: 0,
		source: 0
	})), dr = [
		9,
		13,
		27,
		32
	], fr = On && "CompositionEvent" in window, pr = null;
	On && "documentMode" in document && (pr = document.documentMode);
	var mr = On && "TextEvent" in window && !pr, hr = On && (!fr || pr && 8 < pr && 11 >= pr), gr = " ", _r = !1;
	function vr(e, t) {
		switch (e) {
			case "keyup": return dr.indexOf(t.keyCode) !== -1;
			case "keydown": return t.keyCode !== 229;
			case "keypress":
			case "mousedown":
			case "focusout": return !0;
			default: return !1;
		}
	}
	function yr(e) {
		return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
	}
	var br = !1;
	function xr(e, t) {
		switch (e) {
			case "compositionend": return yr(t);
			case "keypress": return t.which === 32 ? (_r = !0, gr) : null;
			case "textInput": return e = t.data, e === gr && _r ? null : e;
			default: return null;
		}
	}
	function Sr(e, t) {
		if (br) return e === "compositionend" || !fr && vr(e, t) ? (e = Pn(), Nn = Mn = jn = null, br = !1, e) : null;
		switch (e) {
			case "paste": return null;
			case "keypress":
				if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
					if (t.char && 1 < t.char.length) return t.char;
					if (t.which) return String.fromCharCode(t.which);
				}
				return null;
			case "compositionend": return hr && t.locale !== "ko" ? null : t.data;
			default: return null;
		}
	}
	var Cr = {
		color: !0,
		date: !0,
		datetime: !0,
		"datetime-local": !0,
		email: !0,
		month: !0,
		number: !0,
		password: !0,
		range: !0,
		search: !0,
		tel: !0,
		text: !0,
		time: !0,
		url: !0,
		week: !0
	};
	function wr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t === "input" ? !!Cr[e.type] : t === "textarea";
	}
	function Tr(e, t, n, r) {
		Sn ? Cn ? Cn.push(r) : Cn = [r] : Sn = r, t = Jf(t, "onChange"), 0 < t.length && (n = new Bn("onChange", "change", null, n, r), e.push({
			event: n,
			listeners: t
		}));
	}
	var Er = null, Dr = null;
	function Or(e) {
		Vf(e, 0);
	}
	function kr(e) {
		if (nn(Lt(e))) return e;
	}
	function Ar(e, t) {
		if (e === "change") return t;
	}
	var jr = !1;
	if (On) {
		var Mr;
		if (On) {
			var Nr = "oninput" in document;
			if (!Nr) {
				var Pr = document.createElement("div");
				Pr.setAttribute("oninput", "return;"), Nr = typeof Pr.oninput == "function";
			}
			Mr = Nr;
		} else Mr = !1;
		jr = Mr && (!document.documentMode || 9 < document.documentMode);
	}
	function Fr() {
		Er && (Er.detachEvent("onpropertychange", Ir), Dr = Er = null);
	}
	function Ir(e) {
		if (e.propertyName === "value" && kr(Dr)) {
			var t = [];
			Tr(t, Dr, e, xn(e)), En(Or, t);
		}
	}
	function Lr(e, t, n) {
		e === "focusin" ? (Fr(), Er = t, Dr = n, Er.attachEvent("onpropertychange", Ir)) : e === "focusout" && Fr();
	}
	function Rr(e) {
		if (e === "selectionchange" || e === "keyup" || e === "keydown") return kr(Dr);
	}
	function zr(e, t) {
		if (e === "click") return kr(t);
	}
	function Br(e, t) {
		if (e === "input" || e === "change") return kr(t);
	}
	function Vr(e, t) {
		return e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
	}
	var z = typeof Object.is == "function" ? Object.is : Vr;
	function Hr(e, t) {
		if (z(e, t)) return !0;
		if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
		var n = Object.keys(e), r = Object.keys(t);
		if (n.length !== r.length) return !1;
		for (r = 0; r < n.length; r++) {
			var i = n[r];
			if (!ze.call(t, i) || !z(e[i], t[i])) return !1;
		}
		return !0;
	}
	function Ur(e) {
		if (e ||= typeof document < "u" ? document : void 0, e === void 0) return null;
		try {
			return e.activeElement || e.body;
		} catch {
			return e.body;
		}
	}
	function Wr(e) {
		for (; e && e.firstChild;) e = e.firstChild;
		return e;
	}
	function Gr(e, t) {
		var n = Wr(e);
		e = 0;
		for (var r; n;) {
			if (n.nodeType === 3) {
				if (r = e + n.textContent.length, e <= t && r >= t) return {
					node: n,
					offset: t - e
				};
				e = r;
			}
			a: {
				for (; n;) {
					if (n.nextSibling) {
						n = n.nextSibling;
						break a;
					}
					n = n.parentNode;
				}
				n = void 0;
			}
			n = Wr(n);
		}
	}
	function Kr(e, t) {
		return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Kr(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
	}
	function qr(e) {
		e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
		for (var t = Ur(e.document); t instanceof e.HTMLIFrameElement;) {
			try {
				var n = typeof t.contentWindow.location.href == "string";
			} catch {
				n = !1;
			}
			if (n) e = t.contentWindow;
			else break;
			t = Ur(e.document);
		}
		return t;
	}
	function Jr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
	}
	var Yr = On && "documentMode" in document && 11 >= document.documentMode, Xr = null, Zr = null, Qr = null, $r = !1;
	function ei(e, t, n) {
		var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
		$r || Xr == null || Xr !== Ur(r) || (r = Xr, "selectionStart" in r && Jr(r) ? r = {
			start: r.selectionStart,
			end: r.selectionEnd
		} : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = {
			anchorNode: r.anchorNode,
			anchorOffset: r.anchorOffset,
			focusNode: r.focusNode,
			focusOffset: r.focusOffset
		}), Qr && Hr(Qr, r) || (Qr = r, r = Jf(Zr, "onSelect"), 0 < r.length && (t = new Bn("onSelect", "select", null, t, n), e.push({
			event: t,
			listeners: r
		}), t.target = Xr)));
	}
	function ti(e, t) {
		var n = {};
		return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
	}
	var ni = {
		animationend: ti("Animation", "AnimationEnd"),
		animationiteration: ti("Animation", "AnimationIteration"),
		animationstart: ti("Animation", "AnimationStart"),
		transitionrun: ti("Transition", "TransitionRun"),
		transitionstart: ti("Transition", "TransitionStart"),
		transitioncancel: ti("Transition", "TransitionCancel"),
		transitionend: ti("Transition", "TransitionEnd")
	}, ri = {}, ii = {};
	On && (ii = document.createElement("div").style, "AnimationEvent" in window || (delete ni.animationend.animation, delete ni.animationiteration.animation, delete ni.animationstart.animation), "TransitionEvent" in window || delete ni.transitionend.transition);
	function ai(e) {
		if (ri[e]) return ri[e];
		if (!ni[e]) return e;
		var t = ni[e], n;
		for (n in t) if (t.hasOwnProperty(n) && n in ii) return ri[e] = t[n];
		return e;
	}
	var oi = ai("animationend"), si = ai("animationiteration"), ci = ai("animationstart"), li = ai("transitionrun"), ui = ai("transitionstart"), di = ai("transitioncancel"), fi = ai("transitionend"), pi = /* @__PURE__ */ new Map(), mi = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
	mi.push("scrollEnd");
	function hi(e, t) {
		pi.set(e, t), Ut(t, [e]);
	}
	var gi = 0;
	function _i(e, t) {
		if (e.name != null && e.name !== "auto") return e.name;
		if (t.autoName !== null) return t.autoName;
		e = bd.identifierPrefix;
		var n = gi++;
		return e = "_" + e + "t_" + n.toString(32) + "_", t.autoName = e;
	}
	function vi(e) {
		if (e == null || typeof e == "string") return e;
		var t = null, n = Od;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = e[n[r]];
			if (i != null) {
				if (i === "none") return "none";
				t = t == null ? i : t + (" " + i);
			}
		}
		return t ?? e.default;
	}
	function yi(e, t) {
		return e = vi(e), t = vi(t), t == null ? e === "auto" ? null : e : t === "auto" ? null : t;
	}
	var bi = typeof reportError == "function" ? reportError : function(e) {
		if (typeof window == "object" && typeof window.ErrorEvent == "function") {
			var t = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: typeof e == "object" && e && typeof e.message == "string" ? String(e.message) : String(e),
				error: e
			});
			if (!window.dispatchEvent(t)) return;
		} else if (typeof process == "object" && typeof process.emit == "function") {
			process.emit("uncaughtException", e);
			return;
		}
		console.error(e);
	}, xi = [], Si = 0, Ci = 0;
	function wi() {
		for (var e = Si, t = Ci = Si = 0; t < e;) {
			var n = xi[t];
			xi[t++] = null;
			var r = xi[t];
			xi[t++] = null;
			var i = xi[t];
			xi[t++] = null;
			var a = xi[t];
			if (xi[t++] = null, r !== null && i !== null) {
				var o = r.pending;
				o === null ? i.next = i : (i.next = o.next, o.next = i), r.pending = i;
			}
			a !== 0 && Oi(n, i, a);
		}
	}
	function Ti(e, t, n, r) {
		xi[Si++] = e, xi[Si++] = t, xi[Si++] = n, xi[Si++] = r, Ci |= r, e.lanes |= r, e = e.alternate, e !== null && (e.lanes |= r);
	}
	function Ei(e, t, n, r) {
		return Ti(e, t, n, r), ki(e);
	}
	function Di(e, t) {
		return Ti(e, null, null, t), ki(e);
	}
	function Oi(e, t, n) {
		e.lanes |= n;
		var r = e.alternate;
		r !== null && (r.lanes |= n);
		for (var i = !1, a = e.return; a !== null;) a.childLanes |= n, r = a.alternate, r !== null && (r.childLanes |= n), a.tag === 22 && (e = a.stateNode, e === null || e._visibility & 1 || (i = !0)), e = a, a = a.return;
		return e.tag === 3 ? (a = e.stateNode, i && t !== null && (i = 31 - nt(n), e = a.hiddenUpdates, r = e[i], r === null ? e[i] = [t] : r.push(t), t.lane = n | 536870912), a) : null;
	}
	function ki(e) {
		if (50 < kd) throw kd = 0, Ad = null, Error(s(185));
		for (var t = e.return; t !== null;) e = t, t = e.return;
		return e.tag === 3 ? e.stateNode : null;
	}
	var Ai = {};
	function ji(e, t, n, r) {
		this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
	}
	function Mi(e, t, n, r) {
		return new ji(e, t, n, r);
	}
	function Ni(e) {
		return e = e.prototype, !(!e || !e.isReactComponent);
	}
	function Pi(e, t) {
		var n = e.alternate;
		return n === null ? (n = Mi(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 1206910976, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n.refCleanup = e.refCleanup, n;
	}
	function Fi(e, t) {
		e.flags &= 1206910978;
		var n = e.alternate;
		return n === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = n.childLanes, e.lanes = n.lanes, e.child = n.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = n.memoizedProps, e.memoizedState = n.memoizedState, e.updateQueue = n.updateQueue, e.type = n.type, t = n.dependencies, e.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}), e;
	}
	function Ii(e, t, n, r, i, a) {
		var o = 0;
		if (r = e, typeof r == "function") Ni(r) && (o = 1);
		else if (typeof r == "string") o = qm(e, n, we.current) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
		else a: switch (r) {
			case le: return e = Mi(31, n, t, i), e.elementType = le, e.lanes = a, e;
			case ee: return Li(n.children, i, a, t);
			case te:
				o = 8, i |= 24;
				break;
			case ne: return e = Mi(12, n, t, i | 2), e.elementType = ne, e.lanes = a, e;
			case ae: return e = Mi(13, n, t, i), e.elementType = ae, e.lanes = a, e;
			case oe: return e = Mi(19, n, t, i), e.elementType = oe, e.lanes = a, e;
			case ue:
			case fe: return e = i | 32, e = Mi(30, n, t, e), e.elementType = fe, e.lanes = a, e.stateNode = {
				autoName: null,
				paired: null,
				clones: null,
				ref: null
			}, e;
			default:
				if (typeof r == "object" && r) switch (r.$$typeof) {
					case re:
						o = 10;
						break a;
					case j:
						o = 9;
						break a;
					case ie:
						o = 11;
						break a;
					case se:
						o = 14;
						break a;
					case ce:
						o = 16, r = null;
						break a;
				}
				o = 29, n = Error(s(130, e === null ? "null" : typeof e, "")), r = null;
		}
		return t = Mi(o, n, t, i), t.elementType = e, t.type = r, t.lanes = a, t;
	}
	function Li(e, t, n, r) {
		return e = Mi(7, e, r, t), e.lanes = n, e;
	}
	function Ri(e, t, n) {
		return e = Mi(6, e, null, t), e.lanes = n, e;
	}
	function zi(e) {
		var t = Mi(18, null, null, 0);
		return t.stateNode = e, t;
	}
	function Bi(e, t, n) {
		return t = Mi(4, e.children === null ? [] : e.children, e.key, t), t.lanes = n, t.stateNode = {
			containerInfo: e.containerInfo,
			pendingChildren: null,
			implementation: e.implementation
		}, t;
	}
	var Vi = /* @__PURE__ */ new WeakMap();
	function Hi(e, t) {
		if (typeof e == "object" && e) {
			var n = Vi.get(e);
			return n === void 0 ? (t = {
				value: e,
				source: t,
				stack: Re(t)
			}, Vi.set(e, t), t) : n;
		}
		return {
			value: e,
			source: t,
			stack: Re(t)
		};
	}
	var Ui = [], Wi = 0, Gi = null, Ki = 0, qi = [], Ji = 0, Yi = null, Xi = 1, Zi = "";
	function Qi(e, t) {
		Ui[Wi++] = Ki, Ui[Wi++] = Gi, Gi = e, Ki = t;
	}
	function $i(e, t, n) {
		qi[Ji++] = Xi, qi[Ji++] = Zi, qi[Ji++] = Yi, Yi = e;
		var r = Xi;
		e = Zi;
		var i = 32 - nt(r) - 1;
		r &= ~(1 << i), n += 1;
		var a = 32 - nt(t) + i;
		if (30 < a) {
			var o = i - i % 5;
			a = (r & (1 << o) - 1).toString(32), r >>= o, i -= o, Xi = 1 << 32 - nt(t) + i | n << i | r, Zi = a + e;
		} else Xi = 1 << a | n << i | r, Zi = e;
	}
	function ea(e) {
		e.return !== null && (Qi(e, 1), $i(e, 1, 0));
	}
	function ta(e) {
		for (; e === Gi;) Gi = Ui[--Wi], Ui[Wi] = null, Ki = Ui[--Wi], Ui[Wi] = null;
		for (; e === Yi;) Yi = qi[--Ji], qi[Ji] = null, Zi = qi[--Ji], qi[Ji] = null, Xi = qi[--Ji], qi[Ji] = null;
	}
	function na(e, t) {
		qi[Ji++] = Xi, qi[Ji++] = Zi, qi[Ji++] = Yi, Xi = t.id, Zi = t.overflow, Yi = e;
	}
	var ra = null, B = null, V = !1, ia = null, aa = !1, oa = Error(s(519));
	function sa(e) {
		throw pa(Hi(Error(s(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", "")), e)), oa;
	}
	function ca(e) {
		var t = e.stateNode, n = e.type, r = e.memoizedProps;
		switch (t[F] = e, t[Et] = r, n) {
			case "dialog":
				Q("cancel", t), Q("close", t);
				break;
			case "iframe":
			case "object":
			case "embed":
				Q("load", t);
				break;
			case "video":
			case "audio":
				for (n = 0; n < zf.length; n++) Q(zf[n], t);
				break;
			case "source":
				Q("error", t);
				break;
			case "img":
			case "image":
			case "link":
				Q("error", t), Q("load", t);
				break;
			case "details":
				Q("toggle", t);
				break;
			case "input":
				Q("invalid", t), sn(t, r.value, r.defaultValue, r.checked, r.defaultChecked, r.type, r.name, !0);
				break;
			case "select":
				Q("invalid", t);
				break;
			case "textarea": Q("invalid", t), un(t, r.value, r.defaultValue, r.children);
		}
		n = r.children, typeof n != "string" && typeof n != "number" && typeof n != "bigint" || t.textContent === "" + n || !0 === r.suppressHydrationWarning || ep(t.textContent, n) ? (r.popover != null && (Q("beforetoggle", t), Q("toggle", t)), r.onScroll != null && Q("scroll", t), r.onScrollEnd != null && Q("scrollend", t), r.onClick != null && (t.onclick = yn), t = !0) : t = !1, t || sa(e, !0);
	}
	function la(e) {
		for (ra = e.return; ra;) switch (ra.tag) {
			case 5:
			case 31:
			case 13:
				aa = !1;
				return;
			case 27:
			case 3:
				aa = !0;
				return;
			default: ra = ra.return;
		}
	}
	function ua(e) {
		if (e !== ra) return !1;
		if (!V) return la(e), V = !0, !1;
		var t = e.tag, n;
		if ((n = t !== 3 && t !== 27) && ((n = t === 5) && (n = e.type, n = n === "form" || n === "button" || pp(e.type, e.memoizedProps)), n = !n), n && B && sa(e), la(e), t === 13) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(317));
			B = dm(e);
		} else if (t === 31) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(317));
			B = dm(e);
		} else t === 27 ? (t = B, Sp(e.type) ? (e = um, um = null, B = e) : B = t) : B = ra ? lm(e.stateNode.nextSibling) : null;
		return !0;
	}
	function da() {
		B = ra = null, V = !1;
	}
	function fa() {
		var e = ia;
		return e !== null && (fd === null ? fd = e : fd.push.apply(fd, e), ia = null), e;
	}
	function pa(e) {
		ia === null ? ia = [e] : ia.push(e);
	}
	var ma = Se(null), ha = null, ga = null;
	function _a(e, t, n) {
		P(ma, t._currentValue), t._currentValue = n;
	}
	function va(e) {
		e._currentValue = ma.current, Ce(ma);
	}
	function ya(e, t, n) {
		for (; e !== null;) {
			var r = e.alternate;
			if ((e.childLanes & t) === t ? r !== null && (r.childLanes & t) !== t && (r.childLanes |= t) : (e.childLanes |= t, r !== null && (r.childLanes |= t)), e === n) break;
			e = e.return;
		}
	}
	function ba(e, t, n, r) {
		var i = e.child;
		for (i !== null && (i.return = e); i !== null;) {
			var a = i.dependencies;
			if (a !== null) {
				var o = i.child;
				a = a.firstContext;
				a: for (; a !== null;) {
					var c = a;
					a = i;
					for (var l = 0; l < t.length; l++) if (c.context === t[l]) {
						a.lanes |= n, c = a.alternate, c !== null && (c.lanes |= n), ya(a.return, n, e), r || (o = null);
						break a;
					}
					a = c.next;
				}
			} else if (i.tag === 18) {
				if (o = i.return, o === null) throw Error(s(341));
				o.lanes |= n, a = o.alternate, a !== null && (a.lanes |= n), ya(o, n, e), o = null;
			} else i.tag === 13 && i.memoizedState !== null && i.memoizedState.dehydrated === null ? (i.lanes |= n, o = i.alternate, o !== null && (o.lanes |= n), ya(i.return, n, e), o = i.child, o = o === null ? null : o.sibling) : o = i.child;
			if (o !== null) o.return = i;
			else for (o = i; o !== null;) {
				if (o === e) {
					o = null;
					break;
				}
				if (i = o.sibling, i !== null) {
					i.return = o.return, o = i;
					break;
				}
				o = o.return;
			}
			i = o;
		}
	}
	function xa(e, t, n, r) {
		e = null;
		for (var i = t, a = !1; i !== null;) {
			if (!a) {
				if (i.flags & 524288) a = !0;
				else if (i.flags & 262144) break;
			}
			if (i.tag === 10) {
				var o = i.alternate;
				if (o === null) throw Error(s(387));
				if (o = o.memoizedProps, o !== null) {
					var c = i.type;
					z(i.pendingProps.value, o.value) || (e === null ? e = [c] : e.push(c));
				}
			} else if (i === De.current) {
				if (o = i.alternate, o === null) throw Error(s(387));
				o.memoizedState.memoizedState !== i.memoizedState.memoizedState && (e === null ? e = [sh] : e.push(sh));
			}
			i = i.return;
		}
		return e !== null && ba(t, e, n, r), t.flags |= 262144, e !== null;
	}
	function Sa(e) {
		for (e = e.firstContext; e !== null;) {
			if (!z(e.context._currentValue, e.memoizedValue)) return !0;
			e = e.next;
		}
		return !1;
	}
	function Ca(e) {
		ha = e, ga = null, e = e.dependencies, e !== null && (e.firstContext = null);
	}
	function wa(e) {
		return Ea(ha, e);
	}
	function Ta(e, t) {
		return ha === null && Ca(e), Ea(e, t);
	}
	function Ea(e, t) {
		var n = t._currentValue;
		if (t = {
			context: t,
			memoizedValue: n,
			next: null
		}, ga === null) {
			if (e === null) throw Error(s(308));
			ga = t, e.dependencies = {
				lanes: 0,
				firstContext: t
			}, e.flags |= 524288;
		} else ga = ga.next = t;
		return n;
	}
	var H = typeof AbortController < "u" ? AbortController : function() {
		var e = [], t = this.signal = {
			aborted: !1,
			addEventListener: function(t, n) {
				e.push(n);
			}
		};
		this.abort = function() {
			t.aborted = !0, e.forEach(function(e) {
				return e();
			});
		};
	}, Da = n.unstable_scheduleCallback, Oa = n.unstable_NormalPriority, ka = {
		$$typeof: re,
		Consumer: null,
		Provider: null,
		_currentValue: null,
		_currentValue2: null,
		_threadCount: 0
	};
	function Aa() {
		return {
			controller: new H(),
			data: /* @__PURE__ */ new Map(),
			refCount: 0
		};
	}
	function ja(e) {
		e.refCount--, e.refCount === 0 && Da(Oa, function() {
			e.controller.abort();
		});
	}
	function Ma(e, t) {
		if (e.pendingLanes & 4194048) {
			var n = e.transitionTypes;
			for (n === null && (n = e.transitionTypes = []), e = 0; e < t.length; e++) {
				var r = t[e];
				n.indexOf(r) === -1 && n.push(r);
			}
		}
	}
	var Na = null;
	function Pa(e) {
		var t = e.transitionTypes;
		return e.transitionTypes = null, t;
	}
	var Fa = null, Ia = 0, La = 0, Ra = null;
	function za(e, t) {
		if (Fa === null) {
			var n = Fa = [];
			Ia = 0, La = Pf(), Ra = {
				status: "pending",
				value: void 0,
				then: function(e) {
					n.push(e);
				}
			};
		}
		return Ia++, t.then(Ba, Ba), t;
	}
	function Ba() {
		if (--Ia === 0 && (Na = null, Fa !== null)) {
			Ra !== null && (Ra.status = "fulfilled");
			var e = Fa;
			Fa = null, La = 0, Ra = null;
			for (var t = 0; t < e.length; t++) (0, e[t])();
		}
	}
	function Va(e, t) {
		var n = [], r = {
			status: "pending",
			value: null,
			reason: null,
			then: function(e) {
				n.push(e);
			}
		};
		return e.then(function() {
			r.status = "fulfilled", r.value = t;
			for (var e = 0; e < n.length; e++) (0, n[e])(t);
		}, function(e) {
			for (r.status = "rejected", r.reason = e, e = 0; e < n.length; e++) (0, n[e])(void 0);
		}), r;
	}
	var Ha = M.S;
	M.S = function(e, t) {
		if (hd = We(), typeof t == "object" && t && typeof t.then == "function" && za(e, t), Na !== null) for (var n = bf; n !== null;) Ma(n, Na), n = n.next;
		if (n = e.types, n !== null) {
			for (var r = bf; r !== null;) Ma(r, n), r = r.next;
			if (La !== 0) {
				r = Na, r === null && (r = Na = []);
				for (var i = 0; i < n.length; i++) {
					var a = n[i];
					r.indexOf(a) === -1 && r.push(a);
				}
			}
		}
		Ha !== null && Ha(e, t);
	};
	var Ua = Se(null);
	function Wa() {
		var e = Ua.current;
		return e === null ? q.pooledCache : e;
	}
	function Ga(e, t) {
		t === null ? P(Ua, Ua.current) : P(Ua, t.pool);
	}
	function Ka() {
		var e = Wa();
		return e === null ? null : {
			parent: ka._currentValue,
			pool: e
		};
	}
	var qa = Error(s(460)), Ja = Error(s(474)), Ya = Error(s(542)), Xa = { then: function() {} };
	function Za(e) {
		return e = e.status, e === "fulfilled" || e === "rejected";
	}
	function Qa(e, t, n) {
		switch (n = e[n], n === void 0 ? e.push(t) : n !== t && (t.then(yn, yn), t = n), t.status) {
			case "fulfilled": return t.value;
			case "rejected": throw e = t.reason, no(e), e === void 0 && !("reason" in t) ? Error(s(600)) : e;
			default:
				if (typeof t.status == "string") t.then(yn, yn);
				else {
					if (e = q, e !== null && 100 < e.shellSuspendCounter) throw Error(s(482));
					e = t, e.status = "pending", e.then(function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "fulfilled", n.value = e;
						}
					}, function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "rejected", n.reason = e;
						}
					});
				}
				switch (t.status) {
					case "fulfilled": return t.value;
					case "rejected": throw e = t.reason, no(e), e;
				}
				throw eo = t, qa;
		}
	}
	function $a(e) {
		try {
			var t = e._init;
			return t(e._payload);
		} catch (e) {
			throw typeof e == "object" && e && typeof e.then == "function" ? (eo = e, qa) : e;
		}
	}
	var eo = null;
	function to() {
		if (eo === null) throw Error(s(459));
		var e = eo;
		return eo = null, e;
	}
	function no(e) {
		if (e === qa || e === Ya) throw Error(s(483));
	}
	var ro = null, io = 0;
	function ao(e) {
		var t = io;
		return io += 1, ro === null && (ro = []), Qa(ro, e, t);
	}
	function oo(e, t) {
		t = t.props.ref, e.ref = t === void 0 ? null : t;
	}
	function so(e, t) {
		throw t.$$typeof === O ? Error(s(525)) : (e = Object.prototype.toString.call(t), Error(s(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e)));
	}
	function co(e) {
		function t(t, n) {
			if (e) {
				var r = t.deletions;
				r === null ? (t.deletions = [n], t.flags |= 16) : r.push(n);
			}
		}
		function n(n, r) {
			if (!e) return null;
			for (; r !== null;) t(n, r), r = r.sibling;
			return null;
		}
		function r(e) {
			for (var t = /* @__PURE__ */ new Map(); e !== null;) e.key === null ? t.set(e.index, e) : t.set(e.key, e), e = e.sibling;
			return t;
		}
		function i(e, t) {
			return e = Pi(e, t), e.index = 0, e.sibling = null, e;
		}
		function a(t, n, r) {
			return t.index = r, e ? (r = t.alternate, r === null ? (t.flags |= 134217730, n) : (r = r.index, r < n ? (t.flags |= 2, n) : r)) : (t.flags |= 1048576, n);
		}
		function o(t) {
			return e && t.alternate === null && (t.flags |= 134217730), t;
		}
		function c(e, t, n, r) {
			return t === null || t.tag !== 6 ? (t = Ri(n, e.mode, r), t.return = e, t) : (t = i(t, n), t.return = e, t);
		}
		function l(e, t, n, r) {
			var a = n.type;
			return a === ee ? (e = d(e, t, n.props.children, r, n.key), oo(e, n), e) : t !== null && (t.elementType === a || typeof a == "object" && a && a.$$typeof === ce && $a(a) === t.type) ? (t = i(t, n.props), oo(t, n), t.return = e, t) : (t = Ii(n.type, n.key, n.props, null, e.mode, r), oo(t, n), t.return = e, t);
		}
		function u(e, t, n, r) {
			return t === null || t.tag !== 4 || t.stateNode.containerInfo !== n.containerInfo || t.stateNode.implementation !== n.implementation ? (t = Bi(n, e.mode, r), t.return = e, t) : (t = i(t, n.children || []), t.return = e, t);
		}
		function d(e, t, n, r, a) {
			return t === null || t.tag !== 7 ? (t = Li(n, e.mode, r, a), t.return = e, t) : (t = i(t, n), t.return = e, t);
		}
		function f(e, t, n) {
			if (typeof t == "string" && t !== "" || typeof t == "number" || typeof t == "bigint") return t = Ri("" + t, e.mode, n), t.return = e, t;
			if (typeof t == "object" && t) {
				switch (t.$$typeof) {
					case k: return n = Ii(t.type, t.key, t.props, null, e.mode, n), oo(n, t), n.return = e, n;
					case A: return t = Bi(t, e.mode, n), t.return = e, t;
					case ce: return t = $a(t), f(e, t, n);
				}
				if (ve(t) || he(t)) return t = Li(t, e.mode, n, null), t.return = e, t;
				if (typeof t.then == "function") return f(e, ao(t), n);
				if (t.$$typeof === re) return f(e, Ta(e, t), n);
				so(e, t);
			}
			return null;
		}
		function p(e, t, n, r) {
			var i = t === null ? null : t.key;
			if (typeof n == "string" && n !== "" || typeof n == "number" || typeof n == "bigint") return i === null ? c(e, t, "" + n, r) : null;
			if (typeof n == "object" && n) {
				switch (n.$$typeof) {
					case k: return n.key === i ? l(e, t, n, r) : null;
					case A: return n.key === i ? u(e, t, n, r) : null;
					case ce: return n = $a(n), p(e, t, n, r);
				}
				if (ve(n) || he(n)) return i === null ? d(e, t, n, r, null) : null;
				if (typeof n.then == "function") return p(e, t, ao(n), r);
				if (n.$$typeof === re) return p(e, t, Ta(e, n), r);
				so(e, n);
			}
			return null;
		}
		function m(e, t, n, r, i) {
			if (typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint") return e = e.get(n) || null, c(t, e, "" + r, i);
			if (typeof r == "object" && r) {
				switch (r.$$typeof) {
					case k: return e = e.get(r.key === null ? n : r.key) || null, l(t, e, r, i);
					case A: return e = e.get(r.key === null ? n : r.key) || null, u(t, e, r, i);
					case ce: return r = $a(r), m(e, t, n, r, i);
				}
				if (ve(r) || he(r)) return e = e.get(n) || null, d(t, e, r, i, null);
				if (typeof r.then == "function") return m(e, t, n, ao(r), i);
				if (r.$$typeof === re) return m(e, t, n, Ta(t, r), i);
				so(t, r);
			}
			return null;
		}
		function h(i, o, s, c) {
			for (var l = null, u = null, d = o, h = o = 0, g = null; d !== null && h < s.length; h++) {
				d.index > h ? (g = d, d = null) : g = d.sibling;
				var _ = p(i, d, s[h], c);
				if (_ === null) {
					d === null && (d = g);
					break;
				}
				e && d && _.alternate === null && t(i, d), o = a(_, o, h), u === null ? l = _ : u.sibling = _, u = _, d = g;
			}
			if (h === s.length) return n(i, d), V && Qi(i, h), l;
			if (d === null) {
				for (; h < s.length; h++) d = f(i, s[h], c), d !== null && (o = a(d, o, h), u === null ? l = d : u.sibling = d, u = d);
				return V && Qi(i, h), l;
			}
			for (d = r(d); h < s.length; h++) g = m(d, i, h, s[h], c), g !== null && (e && (_ = g.alternate, _ !== null && d.delete(_.key === null ? h : _.key)), o = a(g, o, h), u === null ? l = g : u.sibling = g, u = g);
			return e && d.forEach(function(e) {
				return t(i, e);
			}), V && Qi(i, h), l;
		}
		function g(i, o, c, l) {
			if (c == null) throw Error(s(151));
			for (var u = null, d = null, h = o, g = o = 0, _ = null, v = c.next(); h !== null && !v.done; g++, v = c.next()) {
				h.index > g ? (_ = h, h = null) : _ = h.sibling;
				var y = p(i, h, v.value, l);
				if (y === null) {
					h === null && (h = _);
					break;
				}
				e && h && y.alternate === null && t(i, h), o = a(y, o, g), d === null ? u = y : d.sibling = y, d = y, h = _;
			}
			if (v.done) return n(i, h), V && Qi(i, g), u;
			if (h === null) {
				for (; !v.done; g++, v = c.next()) v = f(i, v.value, l), v !== null && (o = a(v, o, g), d === null ? u = v : d.sibling = v, d = v);
				return V && Qi(i, g), u;
			}
			for (h = r(h); !v.done; g++, v = c.next()) v = m(h, i, g, v.value, l), v !== null && (e && (_ = v.alternate, _ !== null && h.delete(_.key === null ? g : _.key)), o = a(v, o, g), d === null ? u = v : d.sibling = v, d = v);
			return e && h.forEach(function(e) {
				return t(i, e);
			}), V && Qi(i, g), u;
		}
		function _(e, r, a, c) {
			if (typeof a == "object" && a && a.type === ee && a.key === null && a.props.ref === void 0 && (a = a.props.children), typeof a == "object" && a) {
				switch (a.$$typeof) {
					case k:
						a: {
							for (var l = a.key; r !== null;) {
								if (r.key === l) {
									if (l = a.type, l === ee) {
										if (r.tag === 7) {
											n(e, r.sibling), c = i(r, a.props.children), oo(c, a), c.return = e, e = c;
											break a;
										}
									} else if (r.elementType === l || typeof l == "object" && l && l.$$typeof === ce && $a(l) === r.type) {
										n(e, r.sibling), c = i(r, a.props), oo(c, a), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							a.type === ee ? (c = Li(a.props.children, e.mode, c, a.key), oo(c, a), c.return = e, e = c) : (c = Ii(a.type, a.key, a.props, null, e.mode, c), oo(c, a), c.return = e, e = c);
						}
						return o(e);
					case A:
						a: {
							for (l = a.key; r !== null;) {
								if (r.key === l) {
									if (r.tag === 4 && r.stateNode.containerInfo === a.containerInfo && r.stateNode.implementation === a.implementation) {
										n(e, r.sibling), c = i(r, a.children || []), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							c = Bi(a, e.mode, c), c.return = e, e = c;
						}
						return o(e);
					case ce: return a = $a(a), _(e, r, a, c);
				}
				if (ve(a)) return h(e, r, a, c);
				if (he(a)) {
					if (l = he(a), typeof l != "function") throw Error(s(150));
					return a = l.call(a), g(e, r, a, c);
				}
				if (typeof a.then == "function") return _(e, r, ao(a), c);
				if (a.$$typeof === re) return _(e, r, Ta(e, a), c);
				so(e, a);
			}
			return typeof a == "string" && a !== "" || typeof a == "number" || typeof a == "bigint" ? (a = "" + a, r !== null && r.tag === 6 ? (n(e, r.sibling), c = i(r, a), c.return = e, e = c) : (n(e, r), c = Ri(a, e.mode, c), c.return = e, e = c), o(e)) : n(e, r);
		}
		return function(e, t, n, r) {
			try {
				io = 0;
				var i = _(e, t, n, r);
				return ro = null, i;
			} catch (t) {
				if (t === qa || t === Ya) throw t;
				var a = Mi(29, t, null, e.mode);
				return a.lanes = r, a.return = e, a;
			}
		};
	}
	var lo = co(!0), uo = co(!1), fo = !1;
	function po(e) {
		e.updateQueue = {
			baseState: e.memoizedState,
			firstBaseUpdate: null,
			lastBaseUpdate: null,
			shared: {
				pending: null,
				lanes: 0,
				hiddenCallbacks: null
			},
			callbacks: null
		};
	}
	function mo(e, t) {
		e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
			baseState: e.baseState,
			firstBaseUpdate: e.firstBaseUpdate,
			lastBaseUpdate: e.lastBaseUpdate,
			shared: e.shared,
			callbacks: null
		});
	}
	function ho(e) {
		return {
			lane: e,
			tag: 0,
			payload: null,
			callback: null,
			next: null
		};
	}
	function go(e, t, n) {
		var r = e.updateQueue;
		if (r === null) return null;
		if (r = r.shared, K & 2) {
			var i = r.pending;
			return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, t = ki(e), Oi(e, null, n), t;
		}
		return Ti(e, r, t, n), ki(e);
	}
	function _o(e, t, n) {
		if (t = t.updateQueue, t !== null && (t = t.shared, n & 4194048)) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, yt(e, n);
		}
	}
	function vo(e, t) {
		var n = e.updateQueue, r = e.alternate;
		if (r !== null && (r = r.updateQueue, n === r)) {
			var i = null, a = null;
			if (n = n.firstBaseUpdate, n !== null) {
				do {
					var o = {
						lane: n.lane,
						tag: n.tag,
						payload: n.payload,
						callback: null,
						next: null
					};
					a === null ? i = a = o : a = a.next = o, n = n.next;
				} while (n !== null);
				a === null ? i = a = t : a = a.next = t;
			} else i = a = t;
			n = {
				baseState: r.baseState,
				firstBaseUpdate: i,
				lastBaseUpdate: a,
				shared: r.shared,
				callbacks: r.callbacks
			}, e.updateQueue = n;
		} else e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
	}
	var yo = !1;
	function bo() {
		if (yo) {
			var e = Ra;
			if (e !== null) throw e;
		}
	}
	function xo(e, t, n, r) {
		yo = !1;
		var i = e.updateQueue;
		fo = !1;
		var a = i.firstBaseUpdate, o = i.lastBaseUpdate, s = i.shared.pending;
		if (s !== null) {
			i.shared.pending = null;
			var c = s, l = c.next;
			c.next = null, o === null ? a = l : o.next = l, o = c;
			var u = e.alternate;
			u !== null && (u = u.updateQueue, s = u.lastBaseUpdate, s !== o && (s === null ? u.firstBaseUpdate = l : s.next = l, u.lastBaseUpdate = c));
		}
		if (a !== null) {
			var d = i.baseState;
			o = 0, u = l = c = null, s = a;
			do {
				var f = s.lane & -536870913, p = f !== s.lane;
				if (p ? (Y & f) === f : (r & f) === f) {
					f !== 0 && f === La && (yo = !0), u !== null && (u = u.next = {
						lane: 0,
						tag: s.tag,
						payload: s.payload,
						callback: null,
						next: null
					});
					a: {
						var m = e, h = s;
						f = t;
						var g = n;
						switch (h.tag) {
							case 1:
								if (m = h.payload, typeof m == "function") {
									d = m.call(g, d, f);
									break a;
								}
								d = m;
								break a;
							case 3: m.flags = m.flags & -65537 | 128;
							case 0:
								if (m = h.payload, f = typeof m == "function" ? m.call(g, d, f) : m, f == null) break a;
								d = D({}, d, f);
								break a;
							case 2: fo = !0;
						}
					}
					f = s.callback, f !== null && (e.flags |= 64, p && (e.flags |= 8192), p = i.callbacks, p === null ? i.callbacks = [f] : p.push(f));
				} else p = {
					lane: f,
					tag: s.tag,
					payload: s.payload,
					callback: s.callback,
					next: null
				}, u === null ? (l = u = p, c = d) : u = u.next = p, o |= f;
				if (s = s.next, s === null) {
					if (s = i.shared.pending, s === null) break;
					p = s, s = p.next, p.next = null, i.lastBaseUpdate = p, i.shared.pending = null;
				}
			} while (1);
			u === null && (c = d), i.baseState = c, i.firstBaseUpdate = l, i.lastBaseUpdate = u, a === null && (i.shared.lanes = 0), od |= o, e.lanes = o, e.memoizedState = d;
		}
	}
	function So(e, t) {
		if (typeof e != "function") throw Error(s(191, e));
		e.call(t);
	}
	function Co(e, t) {
		var n = e.callbacks;
		if (n !== null) for (e.callbacks = null, e = 0; e < n.length; e++) So(n[e], t);
	}
	var wo = Se(null), To = Se(0);
	function Eo(e, t) {
		e = id, P(To, e), P(wo, t), id = e | t.baseLanes;
	}
	function Do() {
		P(To, id), P(wo, wo.current);
	}
	function Oo() {
		id = To.current, Ce(wo), Ce(To);
	}
	var ko = Se(null), Ao = null;
	function jo(e) {
		var t = e.alternate;
		P(Io, Io.current & 1), P(ko, e), Ao === null && (t === null || wo.current !== null || t.memoizedState !== null) && (Ao = e);
	}
	function Mo(e) {
		P(Io, Io.current), P(ko, e), Ao === null && (Ao = e);
	}
	function No(e) {
		e.tag === 22 ? (P(Io, Io.current), P(ko, e), Ao === null && (Ao = e)) : Po();
	}
	function Po() {
		P(Io, Io.current), P(ko, ko.current);
	}
	function Fo(e) {
		Ce(ko), Ao === e && (Ao = null), Ce(Io);
	}
	var Io = Se(0);
	function Lo(e, t) {
		P(ko, ko.current), P(Io, t);
	}
	function Ro(e) {
		Ce(Io), Ce(ko), Ao === e && (Ao = null);
	}
	function zo(e) {
		for (var t = e; t !== null;) {
			if (t.tag === 13) {
				var n = t.memoizedState;
				if (n !== null && (n = n.dehydrated, n === null || om(n) || sm(n))) return t;
			} else if (t.tag === 19 && t.memoizedProps.revealOrder !== "independent") {
				if (t.flags & 128) return t;
			} else if (t.child !== null) {
				t.child.return = t, t = t.child;
				continue;
			}
			if (t === e) break;
			for (; t.sibling === null;) {
				if (t.return === null || t.return === e) return null;
				t = t.return;
			}
			t.sibling.return = t.return, t = t.sibling;
		}
		return null;
	}
	var Bo = 0, U = null, W = null, Vo = null, Ho = !1, Uo = !1, Wo = !1, Go = 0, Ko = 0, qo = null, Jo = 0;
	function Yo() {
		throw Error(s(321));
	}
	function Xo(e, t) {
		if (t === null) return !1;
		for (var n = 0; n < t.length && n < e.length; n++) if (!z(e[n], t[n])) return !1;
		return !0;
	}
	function Zo(e, t, n, r, i, a) {
		return Bo = a, U = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, M.H = e === null || e.memoizedState === null ? mc : hc, Wo = !1, a = n(r, i), Wo = !1, Uo && (a = $o(t, n, r, i)), Qo(e), a;
	}
	function Qo(e) {
		M.H = pc;
		var t = W !== null && W.next !== null;
		if (Bo = 0, Vo = W = U = null, Ho = !1, Ko = 0, qo = null, t) throw Error(s(300));
		e === null || Mc || (e = e.dependencies, e !== null && Sa(e) && (Mc = !0));
	}
	function $o(e, t, n, r) {
		U = e;
		var i = 0;
		do {
			if (Uo && (qo = null), Ko = 0, Uo = !1, 25 <= i) throw Error(s(301));
			if (i += 1, Vo = W = null, e.updateQueue != null) {
				var a = e.updateQueue;
				a.lastEffect = null, a.events = null, a.stores = null, a.memoCache != null && (a.memoCache.index = 0);
			}
			M.H = gc, a = t(n, r);
		} while (Uo);
		return a;
	}
	function es() {
		var e = M.H, t = e.useState()[0];
		return t = typeof t.then == "function" ? ss(t) : t, e = e.useState()[0], (W === null ? null : W.memoizedState) !== e && (U.flags |= 1024), t;
	}
	function ts() {
		var e = Go !== 0;
		return Go = 0, e;
	}
	function ns(e, t, n) {
		t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~n;
	}
	function rs(e) {
		if (Ho) {
			for (e = e.memoizedState; e !== null;) {
				var t = e.queue;
				t !== null && (t.pending = null), e = e.next;
			}
			Ho = !1;
		}
		Bo = 0, Vo = W = U = null, Uo = !1, Ko = Go = 0, qo = null;
	}
	function is() {
		var e = {
			memoizedState: null,
			baseState: null,
			baseQueue: null,
			queue: null,
			next: null
		};
		return Vo === null ? U.memoizedState = Vo = e : Vo = Vo.next = e, Vo;
	}
	function as() {
		if (W === null) {
			var e = U.alternate;
			e = e === null ? null : e.memoizedState;
		} else e = W.next;
		var t = Vo === null ? U.memoizedState : Vo.next;
		if (t !== null) Vo = t, W = e;
		else {
			if (e === null) throw U.alternate === null ? Error(s(467)) : Error(s(310));
			W = e, e = {
				memoizedState: W.memoizedState,
				baseState: W.baseState,
				baseQueue: W.baseQueue,
				queue: W.queue,
				next: null
			}, Vo === null ? U.memoizedState = Vo = e : Vo = Vo.next = e;
		}
		return Vo;
	}
	function os() {
		return {
			lastEffect: null,
			events: null,
			stores: null,
			memoCache: null
		};
	}
	function ss(e) {
		var t = Ko;
		return Ko += 1, qo === null && (qo = []), e = Qa(qo, e, t), t = U, (Vo === null ? t.memoizedState : Vo.next) === null && (t = t.alternate, M.H = t === null || t.memoizedState === null ? mc : hc), e;
	}
	function cs(e) {
		if (typeof e == "object" && e) {
			if (typeof e.then == "function") return ss(e);
			if (e.$$typeof === pe) return;
			if (e.$$typeof === re) return wa(e);
		}
		throw Error(s(438, String(e)));
	}
	function ls(e) {
		var t = null, n = U.updateQueue;
		if (n !== null && (t = n.memoCache), t == null) {
			var r = U.alternate;
			r !== null && (r = r.updateQueue, r !== null && (r = r.memoCache, r != null && (t = {
				data: r.data.map(function(e) {
					return e.slice();
				}),
				index: 0
			})));
		}
		if (t ??= {
			data: [],
			index: 0
		}, n === null && (n = os(), U.updateQueue = n), n.memoCache = t, n = t.data[t.index], n === void 0) for (n = t.data[t.index] = Array(e), r = 0; r < e; r++) n[r] = de;
		return t.index++, n;
	}
	function us(e, t) {
		return typeof t == "function" ? t(e) : t;
	}
	function ds(e) {
		return fs(as(), W, e);
	}
	function fs(e, t, n) {
		var r = e.queue;
		if (r === null) throw Error(s(311));
		r.lastRenderedReducer = n;
		var i = e.baseQueue, a = r.pending;
		if (a !== null) {
			if (i !== null) {
				var o = i.next;
				i.next = a.next, a.next = o;
			}
			t.baseQueue = i = a, r.pending = null;
		}
		if (a = e.baseState, i === null) e.memoizedState = a;
		else {
			t = i.next;
			var c = o = null, l = null, u = t, d = !1;
			do {
				var f = u.lane & -536870913;
				if (f === u.lane ? (Bo & f) === f : (Y & f) === f) {
					var p = u.revertLane;
					if (p === 0) l !== null && (l = l.next = {
						lane: 0,
						revertLane: 0,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}), f === La && (d = !0);
					else if ((Bo & p) === p) {
						u = u.next, p === La && (d = !0);
						continue;
					} else f = {
						lane: 0,
						revertLane: u.revertLane,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}, l === null ? (c = l = f, o = a) : l = l.next = f, U.lanes |= p, od |= p;
					f = u.action, Wo && n(a, f), a = u.hasEagerState ? u.eagerState : n(a, f);
				} else p = {
					lane: f,
					revertLane: u.revertLane,
					gesture: u.gesture,
					action: u.action,
					hasEagerState: u.hasEagerState,
					eagerState: u.eagerState,
					next: null
				}, l === null ? (c = l = p, o = a) : l = l.next = p, U.lanes |= f, od |= f;
				u = u.next;
			} while (u !== null && u !== t);
			if (l === null ? o = a : l.next = c, !z(a, e.memoizedState) && (Mc = !0, d && (n = Ra, n !== null))) throw n;
			e.memoizedState = a, e.baseState = o, e.baseQueue = l, r.lastRenderedState = a;
		}
		return i === null && (r.lanes = 0), [e.memoizedState, r.dispatch];
	}
	function ps(e) {
		var t = as(), n = t.queue;
		if (n === null) throw Error(s(311));
		n.lastRenderedReducer = e;
		var r = n.dispatch, i = n.pending, a = t.memoizedState;
		if (i !== null) {
			n.pending = null;
			var o = i = i.next;
			do
				a = e(a, o.action), o = o.next;
			while (o !== i);
			z(a, t.memoizedState) || (Mc = !0), t.memoizedState = a, t.baseQueue === null && (t.baseState = a), n.lastRenderedState = a;
		}
		return [a, r];
	}
	function ms(e, t, n) {
		var r = U, i = as(), a = V;
		if (a) {
			if (n === void 0) throw Error(s(407));
			n = n();
		} else n = t();
		var o = !z((W || i).memoizedState, n);
		if (o && (i.memoizedState = n, Mc = !0), i = i.queue, zs(_s.bind(null, r, i, e), [e]), e = i.getSnapshot !== t || o || Vo !== null && !!(Vo.memoizedState.tag & 1), Ps(e ? 9 : 8, { destroy: void 0 }, gs.bind(null, r, i, n, t), null), e) {
			if (r.flags |= 2048, q === null) throw Error(s(349));
			a || Bo & 127 || hs(r, t, n);
		}
		return n;
	}
	function hs(e, t, n) {
		e.flags |= 16384, e = {
			getSnapshot: t,
			value: n
		}, t = U.updateQueue, t === null ? (t = os(), U.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
	}
	function gs(e, t, n, r) {
		t.value = n, t.getSnapshot = r, vs(t) && ys(e);
	}
	function _s(e, t, n) {
		return n(function() {
			vs(t) && ys(e);
		});
	}
	function vs(e) {
		var t = e.getSnapshot;
		e = e.value;
		try {
			var n = t();
			return !z(e, n);
		} catch {
			return !0;
		}
	}
	function ys(e) {
		var t = Di(e, 2);
		t !== null && Pd(t, e, 2);
	}
	function bs(e) {
		var t = is();
		if (typeof e == "function") {
			var n = e;
			if (e = n(), Wo) {
				tt(!0);
				try {
					n();
				} finally {
					tt(!1);
				}
			}
		}
		return t.memoizedState = t.baseState = e, t.queue = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: us,
			lastRenderedState: e
		}, t;
	}
	function xs(e, t, n, r) {
		return e.baseState = n, fs(e, W, typeof r == "function" ? r : us);
	}
	function Ss(e, t, n, r, i) {
		if (uc(e)) throw Error(s(485));
		if (e = t.action, e !== null) {
			var a = {
				payload: i,
				action: e,
				next: null,
				isTransition: !0,
				status: "pending",
				value: null,
				reason: null,
				listeners: [],
				then: function(e) {
					a.listeners.push(e);
				}
			};
			M.T === null ? a.isTransition = !1 : n(!0), r(a), n = t.pending, n === null ? (a.next = t.pending = a, Cs(t, a)) : (a.next = n.next, t.pending = n.next = a);
		}
	}
	function Cs(e, t) {
		var n = t.action, r = t.payload, i = e.state;
		if (t.isTransition) {
			var a = M.T, o = {};
			o.types = a === null ? null : a.types, M.T = o;
			try {
				var s = n(i, r), c = M.S;
				c !== null && c(o, s), ws(e, t, s);
			} catch (n) {
				Es(e, t, n);
			} finally {
				a !== null && o.types !== null && (a.types = o.types), M.T = a;
			}
		} else try {
			a = n(i, r), ws(e, t, a);
		} catch (n) {
			Es(e, t, n);
		}
	}
	function ws(e, t, n) {
		typeof n == "object" && n && typeof n.then == "function" ? n.then(function(n) {
			Ts(e, t, n);
		}, function(n) {
			return Es(e, t, n);
		}) : Ts(e, t, n);
	}
	function Ts(e, t, n) {
		t.status = "fulfilled", t.value = n, Ds(t), e.state = n, t = e.pending, t !== null && (n = t.next, n === t ? e.pending = null : (n = n.next, t.next = n, Cs(e, n)));
	}
	function Es(e, t, n) {
		var r = e.pending;
		if (e.pending = null, r !== null) {
			r = r.next;
			do
				t.status = "rejected", t.reason = n, Ds(t), t = t.next;
			while (t !== r);
		}
		e.action = null;
	}
	function Ds(e) {
		e = e.listeners;
		for (var t = 0; t < e.length; t++) (0, e[t])();
	}
	function Os(e, t) {
		return t;
	}
	function ks(e, t) {
		if (V) {
			var n = q.formState;
			if (n !== null) {
				a: {
					var r = U;
					if (V) {
						if (B) {
							b: {
								for (var i = B, a = aa; i.nodeType !== 8;) if (!a || (i = lm(i.nextSibling), i === null)) {
									i = null;
									break b;
								}
								a = i.data, i = a === "F!" || a === "F" ? i : null;
							}
							if (i) {
								B = lm(i.nextSibling), r = i.data === "F!";
								break a;
							}
						}
						sa(r);
					}
					r = !1;
				}
				r && (t = n[0]);
			}
		}
		return n = is(), n.memoizedState = n.baseState = t, r = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: Os,
			lastRenderedState: t
		}, n.queue = r, n = sc.bind(null, U, r), r.dispatch = n, r = bs(!1), a = lc.bind(null, U, !1, r.queue), r = is(), i = {
			state: t,
			dispatch: null,
			action: e,
			pending: null
		}, r.queue = i, n = Ss.bind(null, U, i, a, n), i.dispatch = n, r.memoizedState = e, [
			t,
			n,
			!1
		];
	}
	function As(e) {
		return js(as(), W, e);
	}
	function js(e, t, n) {
		if (t = fs(e, t, Os)[0], e = ds(us)[0], typeof t == "object" && t && typeof t.then == "function") try {
			var r = ss(t);
		} catch (e) {
			throw e === qa ? Ya : e;
		}
		else r = t;
		t = as();
		var i = t.queue, a = i.dispatch;
		return n !== t.memoizedState && (U.flags |= 2048, Ps(9, { destroy: void 0 }, Ms.bind(null, i, n), null)), [
			r,
			a,
			e
		];
	}
	function Ms(e, t) {
		e.action = t;
	}
	function Ns(e) {
		var t = as(), n = W;
		if (n !== null) return js(t, n, e);
		as(), t = t.memoizedState, n = as();
		var r = n.queue.dispatch;
		return n.memoizedState = e, [
			t,
			r,
			!1
		];
	}
	function Ps(e, t, n, r) {
		return e = {
			tag: e,
			create: n,
			deps: r,
			inst: t,
			next: null
		}, t = U.updateQueue, t === null && (t = os(), U.updateQueue = t), n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e), e;
	}
	function Fs() {
		return as().memoizedState;
	}
	function Is(e, t, n, r) {
		var i = is();
		U.flags |= e, i.memoizedState = Ps(1 | t, { destroy: void 0 }, n, r === void 0 ? null : r);
	}
	function Ls(e, t, n, r) {
		var i = as();
		r = r === void 0 ? null : r;
		var a = i.memoizedState.inst;
		W !== null && r !== null && Xo(r, W.memoizedState.deps) ? i.memoizedState = Ps(t, a, n, r) : (U.flags |= e, i.memoizedState = Ps(1 | t, a, n, r));
	}
	function Rs(e, t) {
		Is(8390656, 8, e, t);
	}
	function zs(e, t) {
		Ls(2048, 8, e, t);
	}
	function Bs(e) {
		U.flags |= 4;
		var t = U.updateQueue;
		if (t === null) t = os(), U.updateQueue = t, t.events = [e];
		else {
			var n = t.events;
			n === null ? t.events = [e] : n.push(e);
		}
	}
	function Vs(e) {
		var t = as().memoizedState;
		return Bs({
			ref: t,
			nextImpl: e
		}), function() {
			if (K & 2) throw Error(s(440));
			return t.impl.apply(void 0, arguments);
		};
	}
	function Hs(e, t) {
		return Ls(4, 2, e, t);
	}
	function Us(e, t) {
		return Ls(4, 4, e, t);
	}
	function Ws(e, t) {
		if (typeof t == "function") {
			e = e();
			var n = t(e);
			return function() {
				typeof n == "function" ? n() : t(null);
			};
		}
		if (t != null) return e = e(), t.current = e, function() {
			t.current = null;
		};
	}
	function Gs(e, t, n) {
		n = n == null ? null : n.concat([e]), Ls(4, 4, Ws.bind(null, t, e), n);
	}
	function Ks() {}
	function qs(e, t) {
		var n = as();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		return t !== null && Xo(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
	}
	function Js(e, t) {
		var n = as();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		if (t !== null && Xo(t, r[1])) return r[0];
		if (r = e(), Wo) {
			tt(!0);
			try {
				e();
			} finally {
				tt(!1);
			}
		}
		return n.memoizedState = [r, t], r;
	}
	function Ys(e, t, n) {
		return n === void 0 || Bo & 1073741824 && !(Y & 261930) ? e.memoizedState = t : (e.memoizedState = n, e = Md(), U.lanes |= e, od |= e, n);
	}
	function Xs(e, t, n, r) {
		return z(n, t) ? n : wo.current === null ? !(Bo & 106) || Bo & 1073741824 && !(Y & 261930) ? (Mc = !0, e.memoizedState = n) : (e = Md(), U.lanes |= e, od |= e, t) : (e = Ys(e, n, r), z(e, t) || (Mc = !0), e);
	}
	function Zs(e, t, n, r, i) {
		var a = N.p;
		N.p = a !== 0 && 8 > a ? a : 8;
		var o = M.T, s = {};
		s.types = o === null ? null : o.types, M.T = s, lc(e, !1, t, n);
		try {
			var c = i(), l = M.S;
			l !== null && l(s, c), typeof c == "object" && c && typeof c.then == "function" ? cc(e, t, Va(c, r), jd(e)) : cc(e, t, r, jd(e));
		} catch (n) {
			cc(e, t, {
				then: function() {},
				status: "rejected",
				reason: n
			}, jd());
		} finally {
			N.p = a, o !== null && s.types !== null && (o.types = s.types), M.T = o;
		}
	}
	function Qs() {}
	function $s(e, t, n, r) {
		if (e.tag !== 5) throw Error(s(476));
		var i = ec(e).queue;
		Zs(e, i, t, ye, n === null ? Qs : function() {
			return tc(e), n(r);
		});
	}
	function ec(e) {
		var t = e.memoizedState;
		if (t !== null) return t;
		t = {
			memoizedState: ye,
			baseState: ye,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: us,
				lastRenderedState: ye
			},
			next: null
		};
		var n = {};
		return t.next = {
			memoizedState: n,
			baseState: n,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: us,
				lastRenderedState: n
			},
			next: null
		}, e.memoizedState = t, e = e.alternate, e !== null && (e.memoizedState = t), t;
	}
	function tc(e) {
		var t = ec(e);
		t.next === null && (t = e.alternate.memoizedState), cc(e, t.next.queue, {}, jd());
	}
	function nc() {
		return wa(sh);
	}
	function rc() {
		return as().memoizedState;
	}
	function ic() {
		return as().memoizedState;
	}
	function ac(e) {
		for (var t = e.return; t !== null;) {
			switch (t.tag) {
				case 24:
				case 3:
					var n = jd();
					e = ho(n);
					var r = go(t, e, n);
					r !== null && (Pd(r, t, n), _o(r, t, n)), t = { cache: Aa() }, e.payload = t;
					return;
			}
			t = t.return;
		}
	}
	function oc(e, t, n) {
		var r = jd();
		n = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, uc(e) ? dc(t, n) : (n = Ei(e, t, n, r), n !== null && (Pd(n, e, r), fc(n, t, r)));
	}
	function sc(e, t, n) {
		cc(e, t, n, jd());
	}
	function cc(e, t, n, r) {
		var i = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		if (uc(e)) dc(t, i);
		else {
			var a = e.alternate;
			if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
				var o = t.lastRenderedState, s = a(o, n);
				if (i.hasEagerState = !0, i.eagerState = s, z(s, o)) return Ti(e, t, i, 0), q === null && wi(), !1;
			} catch {}
			if (n = Ei(e, t, i, r), n !== null) return Pd(n, e, r), fc(n, t, r), !0;
		}
		return !1;
	}
	function lc(e, t, n, r) {
		if (r = {
			lane: 2,
			revertLane: Pf(),
			gesture: null,
			action: r,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, uc(e)) {
			if (t) throw Error(s(479));
		} else t = Ei(e, n, r, 2), t !== null && Pd(t, e, 2);
	}
	function uc(e) {
		var t = e.alternate;
		return e === U || t !== null && t === U;
	}
	function dc(e, t) {
		Uo = Ho = !0;
		var n = e.pending;
		n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
	}
	function fc(e, t, n) {
		if (n & 4194048) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, yt(e, n);
		}
	}
	var pc = {
		readContext: wa,
		use: cs,
		useCallback: Yo,
		useContext: Yo,
		useEffect: Yo,
		useImperativeHandle: Yo,
		useLayoutEffect: Yo,
		useInsertionEffect: Yo,
		useMemo: Yo,
		useReducer: Yo,
		useRef: Yo,
		useState: Yo,
		useDebugValue: Yo,
		useDeferredValue: Yo,
		useTransition: Yo,
		useSyncExternalStore: Yo,
		useId: Yo,
		useHostTransitionStatus: Yo,
		useFormState: Yo,
		useActionState: Yo,
		useOptimistic: Yo,
		useMemoCache: Yo,
		useCacheRefresh: Yo,
		useEffectEvent: Yo
	}, mc = {
		readContext: wa,
		use: cs,
		useCallback: function(e, t) {
			return is().memoizedState = [e, t === void 0 ? null : t], e;
		},
		useContext: wa,
		useEffect: Rs,
		useImperativeHandle: function(e, t, n) {
			n = n == null ? null : n.concat([e]), Is(4194308, 4, Ws.bind(null, t, e), n);
		},
		useLayoutEffect: function(e, t) {
			return Is(4194308, 4, e, t);
		},
		useInsertionEffect: function(e, t) {
			Is(4, 2, e, t);
		},
		useMemo: function(e, t) {
			var n = is();
			t = t === void 0 ? null : t;
			var r = e();
			if (Wo) {
				tt(!0);
				try {
					e();
				} finally {
					tt(!1);
				}
			}
			return n.memoizedState = [r, t], r;
		},
		useReducer: function(e, t, n) {
			var r = is();
			if (n !== void 0) {
				var i = n(t);
				if (Wo) {
					tt(!0);
					try {
						n(t);
					} finally {
						tt(!1);
					}
				}
			} else i = t;
			return r.memoizedState = r.baseState = i, e = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: e,
				lastRenderedState: i
			}, r.queue = e, e = e.dispatch = oc.bind(null, U, e), [r.memoizedState, e];
		},
		useRef: function(e) {
			var t = is();
			return e = { current: e }, t.memoizedState = e;
		},
		useState: function(e) {
			e = bs(e);
			var t = e.queue, n = sc.bind(null, U, t);
			return t.dispatch = n, [e.memoizedState, n];
		},
		useDebugValue: Ks,
		useDeferredValue: function(e, t) {
			return Ys(is(), e, t);
		},
		useTransition: function() {
			var e = bs(!1);
			return e = Zs.bind(null, U, e.queue, !0, !1), is().memoizedState = e, [!1, e];
		},
		useSyncExternalStore: function(e, t, n) {
			var r = U, i = is();
			if (V) {
				if (n === void 0) throw Error(s(407));
				n = n();
			} else {
				if (n = t(), q === null) throw Error(s(349));
				Y & 127 || hs(r, t, n);
			}
			i.memoizedState = n;
			var a = {
				value: n,
				getSnapshot: t
			};
			return i.queue = a, Rs(_s.bind(null, r, a, e), [e]), r.flags |= 2048, Ps(9, { destroy: void 0 }, gs.bind(null, r, a, n, t), null), n;
		},
		useId: function() {
			var e = is(), t = q.identifierPrefix;
			if (V) {
				var n = Zi, r = Xi;
				n = (r & ~(1 << 32 - nt(r) - 1)).toString(32) + n, t = "_" + t + "R_" + n, n = Go++, 0 < n && (t += "H" + n.toString(32)), t += "_";
			} else n = Jo++, t = "_" + t + "r_" + n.toString(32) + "_";
			return e.memoizedState = t;
		},
		useHostTransitionStatus: nc,
		useFormState: ks,
		useActionState: ks,
		useOptimistic: function(e) {
			var t = is();
			t.memoizedState = t.baseState = e;
			var n = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: null,
				lastRenderedState: null
			};
			return t.queue = n, t = lc.bind(null, U, !0, n), n.dispatch = t, [e, t];
		},
		useMemoCache: ls,
		useCacheRefresh: function() {
			return is().memoizedState = ac.bind(null, U);
		},
		useEffectEvent: function(e) {
			var t = is(), n = { impl: e };
			return t.memoizedState = n, function() {
				if (K & 2) throw Error(s(440));
				return n.impl.apply(void 0, arguments);
			};
		}
	}, hc = {
		readContext: wa,
		use: cs,
		useCallback: qs,
		useContext: wa,
		useEffect: zs,
		useImperativeHandle: Gs,
		useInsertionEffect: Hs,
		useLayoutEffect: Us,
		useMemo: Js,
		useReducer: ds,
		useRef: Fs,
		useState: function() {
			return ds(us);
		},
		useDebugValue: Ks,
		useDeferredValue: function(e, t) {
			return Xs(as(), W.memoizedState, e, t);
		},
		useTransition: function() {
			var e = ds(us)[0], t = as().memoizedState;
			return [typeof e == "boolean" ? e : ss(e), t];
		},
		useSyncExternalStore: ms,
		useId: rc,
		useHostTransitionStatus: nc,
		useFormState: As,
		useActionState: As,
		useOptimistic: function(e, t) {
			return xs(as(), W, e, t);
		},
		useMemoCache: ls,
		useCacheRefresh: ic,
		useEffectEvent: Vs
	}, gc = {
		readContext: wa,
		use: cs,
		useCallback: qs,
		useContext: wa,
		useEffect: zs,
		useImperativeHandle: Gs,
		useInsertionEffect: Hs,
		useLayoutEffect: Us,
		useMemo: Js,
		useReducer: ps,
		useRef: Fs,
		useState: function() {
			return ps(us);
		},
		useDebugValue: Ks,
		useDeferredValue: function(e, t) {
			var n = as();
			return W === null ? Ys(n, e, t) : Xs(n, W.memoizedState, e, t);
		},
		useTransition: function() {
			var e = ps(us)[0], t = as().memoizedState;
			return [typeof e == "boolean" ? e : ss(e), t];
		},
		useSyncExternalStore: ms,
		useId: rc,
		useHostTransitionStatus: nc,
		useFormState: Ns,
		useActionState: Ns,
		useOptimistic: function(e, t) {
			var n = as();
			return W === null ? (n.baseState = e, [e, n.queue.dispatch]) : xs(n, W, e, t);
		},
		useMemoCache: ls,
		useCacheRefresh: ic,
		useEffectEvent: Vs
	};
	function _c(e, t, n, r) {
		t = e.memoizedState, n = n(r, t), n = n == null ? t : D({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
	}
	var vc = {
		enqueueSetState: function(e, t, n) {
			e = e._reactInternals;
			var r = jd(), i = ho(r);
			i.payload = t, n != null && (i.callback = n), t = go(e, i, r), t !== null && (Pd(t, e, r), _o(t, e, r));
		},
		enqueueReplaceState: function(e, t, n) {
			e = e._reactInternals;
			var r = jd(), i = ho(r);
			i.tag = 1, i.payload = t, n != null && (i.callback = n), t = go(e, i, r), t !== null && (Pd(t, e, r), _o(t, e, r));
		},
		enqueueForceUpdate: function(e, t) {
			e = e._reactInternals;
			var n = jd(), r = ho(n);
			r.tag = 2, t != null && (r.callback = t), t = go(e, r, n), t !== null && (Pd(t, e, n), _o(t, e, n));
		}
	};
	function yc(e, t, n, r, i, a, o) {
		return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !Hr(n, r) || !Hr(i, a) : !0;
	}
	function bc(e, t, n, r) {
		e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && vc.enqueueReplaceState(t, t.state, null);
	}
	function xc(e, t) {
		var n = t;
		if ("ref" in t) for (var r in n = {}, t) r !== "ref" && (n[r] = t[r]);
		if (e = e.defaultProps) for (var i in n === t && (n = D({}, n)), e) n[i] === void 0 && (n[i] = e[i]);
		return n;
	}
	function Sc(e) {
		bi(e);
	}
	function Cc(e) {
		console.error(e);
	}
	function wc(e) {
		bi(e);
	}
	function Tc(e, t) {
		try {
			var n = e.onUncaughtError;
			n(t.value, { componentStack: t.stack });
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function Ec(e, t, n) {
		try {
			var r = e.onCaughtError;
			r(n.value, {
				componentStack: n.stack,
				errorBoundary: t.tag === 1 ? t.stateNode : null
			});
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function Dc(e, t, n) {
		return n = ho(n), n.tag = 3, n.payload = { element: null }, n.callback = function() {
			Tc(e, t);
		}, n;
	}
	function Oc(e) {
		return e = ho(e), e.tag = 3, e;
	}
	function kc(e, t, n, r) {
		var i = n.type.getDerivedStateFromError;
		if (typeof i == "function") {
			var a = r.value;
			e.payload = function() {
				return i(a);
			}, e.callback = function() {
				Ec(t, n, r);
			};
		}
		var o = n.stateNode;
		o !== null && typeof o.componentDidCatch == "function" && (e.callback = function() {
			Ec(t, n, r), typeof i != "function" && (vd === null ? vd = /* @__PURE__ */ new Set([this]) : vd.add(this));
			var e = r.stack;
			this.componentDidCatch(r.value, { componentStack: e === null ? "" : e });
		});
	}
	function Ac(e, t, n, r, i) {
		if (n.flags |= 32768, typeof r == "object" && r && typeof r.then == "function") {
			if (t = n.alternate, t !== null && xa(t, n, i, !0), n = ko.current, n !== null) {
				switch (n.tag) {
					case 31:
					case 13:
					case 19: return Ao === null ? Kd() : n.alternate === null && ad === 0 && (ad = 3), n.flags &= -257, n.flags |= 65536, n.lanes = i, r === Xa ? n.flags |= 16384 : (t = n.updateQueue, t === null ? n.updateQueue = /* @__PURE__ */ new Set([r]) : t.add(r), mf(e, r, i)), !1;
					case 22: return n.flags |= 65536, r === Xa ? n.flags |= 16384 : (t = n.updateQueue, t === null ? (t = {
						transitions: null,
						markerInstances: null,
						retryQueue: /* @__PURE__ */ new Set([r])
					}, n.updateQueue = t) : (n = t.retryQueue, n === null ? t.retryQueue = /* @__PURE__ */ new Set([r]) : n.add(r)), mf(e, r, i)), !1;
				}
				throw Error(s(435, n.tag));
			}
			return mf(e, r, i), Kd(), !1;
		}
		if (V) return t = ko.current, t === null ? (r !== oa && (t = Error(s(423), { cause: r }), pa(Hi(t, n))), e = e.current.alternate, e.flags |= 65536, i &= -i, e.lanes |= i, r = Hi(r, n), i = Dc(e.stateNode, r, i), vo(e, i), ad !== 4 && (ad = 2)) : (!(t.flags & 65536) && (t.flags |= 256), t.flags |= 65536, t.lanes = i, r !== oa && (e = Error(s(422), { cause: r }), pa(Hi(e, n)))), !1;
		var a = Error(s(520), { cause: r });
		if (a = Hi(a, n), dd === null ? dd = [a] : dd.push(a), ad !== 4 && (ad = 2), t === null) return !0;
		r = Hi(r, n), n = t;
		do {
			switch (n.tag) {
				case 3: return n.flags |= 65536, e = i & -i, n.lanes |= e, e = Dc(n.stateNode, r, e), vo(n, e), !1;
				case 1:
					if (t = n.type, a = n.stateNode, !(n.flags & 128) && (typeof t.getDerivedStateFromError == "function" || a !== null && typeof a.componentDidCatch == "function" && (vd === null || !vd.has(a)))) return n.flags |= 65536, i &= -i, n.lanes |= i, i = Oc(i), kc(i, e, n, r), vo(n, i), !1;
					break;
				case 22: if (n.memoizedState !== null) return n.flags |= 65536, !1;
			}
			n = n.return;
		} while (n !== null);
		return !1;
	}
	var jc = Error(s(461)), Mc = !1;
	function Nc(e, t, n, r) {
		t.child = e === null ? uo(t, null, n, r) : lo(t, e.child, n, r);
	}
	function Pc(e, t, n, r, i) {
		n = n.render;
		var a = t.ref;
		if ("ref" in r) {
			var o = {};
			for (var s in r) s !== "ref" && (o[s] = r[s]);
		} else o = r;
		return Ca(t), r = Zo(e, t, n, o, a, i), s = ts(), e !== null && !Mc ? (ns(e, t, i), cl(e, t, i)) : (V && s && ea(t), t.flags |= 1, Nc(e, t, r, i), t.child);
	}
	function Fc(e, t, n, r, i) {
		if (e === null) {
			var a = n.type;
			return typeof a == "function" && !Ni(a) && a.defaultProps === void 0 && n.compare === null ? (t.tag = 15, t.type = a, Ic(e, t, a, r, i)) : (e = Ii(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
		}
		if (a = e.child, !ll(e, i)) {
			var o = a.memoizedProps;
			if (n = n.compare, n = n === null ? Hr : n, n(o, r) && e.ref === t.ref) return cl(e, t, i);
		}
		return t.flags |= 1, e = Pi(a, r), e.ref = t.ref, e.return = t, t.child = e;
	}
	function Ic(e, t, n, r, i) {
		if (e !== null) {
			var a = e.memoizedProps;
			if (Hr(a, r) && e.ref === t.ref) {
				if (Mc = !1, t.pendingProps = r = a, ll(e, i)) e.flags & 131072 && (Mc = !0);
				else return t.lanes = e.lanes, cl(e, t, i);
			}
		}
		return Wc(e, t, n, r, i);
	}
	function Lc(e, t, n, r) {
		var i = r.children, a = e === null ? null : e.memoizedState;
		if (e === null && t.stateNode === null && (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), r.mode === "hidden") {
			if (t.flags & 128) {
				if (a = a === null ? n : a.baseLanes | n, e !== null) {
					for (r = t.child = e.child, i = 0; r !== null;) i = i | r.lanes | r.childLanes, r = r.sibling;
					r = i & ~a;
				} else r = 0, t.child = null;
				return zc(e, t, a, n, r);
			}
			if (n & 536870912) t.memoizedState = {
				baseLanes: 0,
				cachePool: null
			}, e !== null && Ga(t, a === null ? null : a.cachePool), a === null ? Do() : Eo(t, a), No(t);
			else return r = t.lanes = 536870912, zc(e, t, a === null ? n : a.baseLanes | n, n, r);
		} else a === null ? (e !== null && Ga(t, null), Do(), Po()) : (Ga(t, a.cachePool), Eo(t, a), Po(), t.memoizedState = null);
		return Nc(e, t, i, n), t.child;
	}
	function Rc(e, t) {
		return e !== null && e.tag === 22 || t.stateNode !== null || (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), t.sibling;
	}
	function zc(e, t, n, r, i) {
		var a = Wa();
		return a = a === null ? null : {
			parent: ka._currentValue,
			pool: a
		}, t.memoizedState = {
			baseLanes: n,
			cachePool: a
		}, e !== null && Ga(t, null), Do(), No(t), e !== null && xa(e, t, r, !0), t.childLanes = i, null;
	}
	function Bc(e, t) {
		return t = $c({
			mode: t.mode,
			children: t.children
		}, e.mode), t.ref = e.ref, e.child = t, t.return = e, t;
	}
	function Vc(e, t, n) {
		return lo(t, e.child, null, n), e = Bc(t, t.pendingProps), e.flags |= 2, Fo(t), t.memoizedState = null, e;
	}
	function Hc(e, t, n) {
		var r = t.pendingProps, i = !!(t.flags & 128);
		if (t.flags &= -129, e === null) {
			if (V) {
				if (r.mode === "hidden") return e = Bc(t, r), t.lanes = 536870912, e.memoizedState = {
					baseLanes: 0,
					cachePool: null
				}, Rc(null, e);
				if (Mo(t), (e = B) ? (e = am(e, aa), e = e !== null && e.data === "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Yi === null ? null : {
						id: Xi,
						overflow: Zi
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = zi(e), n.return = t, t.child = n, ra = t, B = null)) : e = null, e === null) throw sa(t);
				return t.lanes = 536870912, null;
			}
			return Bc(t, r);
		}
		var a = e.memoizedState;
		if (a !== null) {
			var o = a.dehydrated;
			if (Mo(t), i) {
				if (t.flags & 256) t.flags &= -257, t = Vc(e, t, n);
				else if (t.memoizedState !== null) t.child = e.child, t.flags |= 128, t = null;
				else throw Error(s(558));
			} else if (Mc || xa(e, t, n, !1), i = (n & e.childLanes) !== 0, Mc || i) {
				if (wo.current === null) {
					if (r = q, r !== null && (o = bt(r, n), o !== 0 && o !== a.retryLane)) throw a.retryLane = o, Di(e, o), Pd(r, e, o), jc;
					Kd();
				}
				t = Vc(e, t, n);
			} else e = a.treeContext, B = lm(o.nextSibling), ra = t, V = !0, ia = null, aa = !1, e !== null && na(t, e), t = Bc(t, r), t.flags |= 134221824;
			return t;
		}
		return e = Pi(e.child, {
			mode: r.mode,
			children: r.children
		}), e.ref = t.ref, t.child = e, e.return = t, e;
	}
	function Uc(e, t) {
		var n = t.ref;
		if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
		else {
			if (typeof n != "function" && typeof n != "object") throw Error(s(284));
			(e === null || e.ref !== n) && (t.flags |= 4194816);
		}
	}
	function Wc(e, t, n, r, i) {
		return Ca(t), n = Zo(e, t, n, r, void 0, i), r = ts(), e !== null && !Mc ? (ns(e, t, i), cl(e, t, i)) : (V && r && ea(t), t.flags |= 1, Nc(e, t, n, i), t.child);
	}
	function Gc(e, t, n, r, i, a) {
		return Ca(t), t.updateQueue = null, n = $o(t, r, n, i), Qo(e), r = ts(), e !== null && !Mc ? (ns(e, t, a), cl(e, t, a)) : (V && r && ea(t), t.flags |= 1, Nc(e, t, n, a), t.child);
	}
	function Kc(e, t, n, r, i) {
		if (Ca(t), t.stateNode === null) {
			var a = Ai, o = n.contextType;
			typeof o == "object" && o && (a = wa(o)), a = new n(r, a), t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null, a.updater = vc, t.stateNode = a, a._reactInternals = t, a = t.stateNode, a.props = r, a.state = t.memoizedState, a.refs = {}, po(t), o = n.contextType, a.context = typeof o == "object" && o ? wa(o) : Ai, a.state = t.memoizedState, o = n.getDerivedStateFromProps, typeof o == "function" && (_c(t, n, o, r), a.state = t.memoizedState), typeof n.getDerivedStateFromProps == "function" || typeof a.getSnapshotBeforeUpdate == "function" || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (o = a.state, typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount(), o !== a.state && vc.enqueueReplaceState(a, a.state, null), xo(t, r, a, i), bo(), a.state = t.memoizedState), typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !0;
		} else if (e === null) {
			a = t.stateNode;
			var s = t.memoizedProps, c = xc(n, s);
			a.props = c;
			var l = a.context, u = n.contextType;
			o = Ai, typeof u == "object" && u && (o = wa(u));
			var d = n.getDerivedStateFromProps;
			u = typeof d == "function" || typeof a.getSnapshotBeforeUpdate == "function", s = t.pendingProps !== s, u || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (s || l !== o) && bc(t, a, r, o), fo = !1;
			var f = t.memoizedState;
			a.state = f, xo(t, r, a, i), bo(), l = t.memoizedState, s || f !== l || fo ? (typeof d == "function" && (_c(t, n, d, r), l = t.memoizedState), (c = fo || yc(t, n, c, r, f, l, o)) ? (u || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount()), typeof a.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = l), a.props = r, a.state = l, a.context = o, r = c) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
		} else {
			a = t.stateNode, mo(e, t), o = t.memoizedProps, u = xc(n, o), a.props = u, d = t.pendingProps, f = a.context, l = n.contextType, c = Ai, typeof l == "object" && l && (c = wa(l)), s = n.getDerivedStateFromProps, (l = typeof s == "function" || typeof a.getSnapshotBeforeUpdate == "function") || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (o !== d || f !== c) && bc(t, a, r, c), fo = !1, f = t.memoizedState, a.state = f, xo(t, r, a, i), bo();
			var p = t.memoizedState;
			o !== d || f !== p || fo || e !== null && e.dependencies !== null && Sa(e.dependencies) ? (typeof s == "function" && (_c(t, n, s, r), p = t.memoizedState), (u = fo || yc(t, n, u, r, f, p, c) || e !== null && e.dependencies !== null && Sa(e.dependencies)) ? (l || typeof a.UNSAFE_componentWillUpdate != "function" && typeof a.componentWillUpdate != "function" || (typeof a.componentWillUpdate == "function" && a.componentWillUpdate(r, p, c), typeof a.UNSAFE_componentWillUpdate == "function" && a.UNSAFE_componentWillUpdate(r, p, c)), typeof a.componentDidUpdate == "function" && (t.flags |= 4), typeof a.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = p), a.props = r, a.state = p, a.context = c, r = u) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), r = !1);
		}
		return a = r, Uc(e, t), r = !!(t.flags & 128), a || r ? (a = t.stateNode, n = r && typeof n.getDerivedStateFromError != "function" ? null : a.render(), t.flags |= 1, e !== null && r ? (t.child = lo(t, e.child, null, i), t.child = lo(t, null, n, i)) : Nc(e, t, n, i), t.memoizedState = a.state, e = t.child) : e = cl(e, t, i), e;
	}
	function qc(e, t, n, r) {
		return da(), t.flags |= 256, Nc(e, t, n, r), t.child;
	}
	var Jc = {
		dehydrated: null,
		treeContext: null,
		retryLane: 0,
		hydrationErrors: null
	};
	function Yc(e) {
		return {
			baseLanes: e,
			cachePool: Ka()
		};
	}
	function Xc(e, t, n) {
		return e = e === null ? 0 : e.childLanes & ~n, t && (e |= ld), e;
	}
	function Zc(e, t, n) {
		var r = t.pendingProps, i = !1, a = !!(t.flags & 128), o;
		if ((o = a) || (o = e !== null && e.memoizedState === null ? !1 : !!(Io.current & 2)), o && (i = !0, t.flags &= -129), o = !!(t.flags & 32), t.flags &= -33, e === null) {
			if (V) {
				if (i ? jo(t) : Po(), (e = B) ? (e = am(e, aa), e = e !== null && e.data !== "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Yi === null ? null : {
						id: Xi,
						overflow: Zi
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = zi(e), n.return = t, t.child = n, ra = t, B = null)) : e = null, e === null) throw sa(t);
				return t.lanes = sm(e) ? 32 : 536870912, null;
			}
			return a = r.children, r = r.fallback, i ? (Po(), i = t.mode, a = $c({
				mode: "hidden",
				children: a
			}, i), r = Li(r, i, n, null), a.return = t, r.return = t, a.sibling = r, t.child = a, r = t.child, r.memoizedState = Yc(n), r.childLanes = Xc(e, o, n), t.memoizedState = Jc, Rc(null, r)) : (jo(t), Qc(t, a));
		}
		var s = e.memoizedState;
		if (s !== null) {
			var c = s.dehydrated;
			if (c !== null) return tl(e, t, a, o, r, c, s, n);
		}
		return i ? (Po(), i = r.fallback, a = t.mode, s = e.child, c = s.sibling, r = Pi(s, {
			mode: "hidden",
			children: r.children
		}), r.subtreeFlags = s.subtreeFlags & 1206910976, c === null ? (i = Li(i, a, n, null), i.flags |= 2) : i = Pi(c, i), i.return = t, r.return = t, r.sibling = i, t.child = r, Rc(null, r), r = t.child, i = e.child.memoizedState, i === null ? i = Yc(n) : (a = i.cachePool, a === null ? a = Ka() : (s = ka._currentValue, a = a.parent === s ? a : {
			parent: s,
			pool: s
		}), i = {
			baseLanes: i.baseLanes | n,
			cachePool: a
		}), r.memoizedState = i, r.childLanes = Xc(e, o, n), t.memoizedState = Jc, Rc(e.child, r)) : (jo(t), n = e.child, e = n.sibling, n = Pi(n, {
			mode: "visible",
			children: r.children
		}), n.return = t, n.sibling = null, e !== null && (o = t.deletions, o === null ? (t.deletions = [e], t.flags |= 16) : o.push(e)), t.child = n, t.memoizedState = null, n);
	}
	function Qc(e, t) {
		return t = $c({
			mode: "visible",
			children: t
		}, e.mode), t.return = e, e.child = t;
	}
	function $c(e, t) {
		return e = Mi(22, e, null, t), e.lanes = 0, e;
	}
	function el(e, t, n) {
		return lo(t, e.child, null, n), e = Qc(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
	}
	function tl(e, t, n, r, i, a, o, c) {
		if (n) return t.flags & 256 ? (jo(t), t.flags &= -257, el(e, t, c)) : t.memoizedState === null ? (Po(), a = i.fallback, o = t.mode, i = $c({
			mode: "visible",
			children: i.children
		}, o), a = Li(a, o, c, null), a.flags |= 2, i.return = t, a.return = t, i.sibling = a, t.child = i, lo(t, e.child, null, c), i = t.child, i.memoizedState = Yc(c), i.childLanes = Xc(e, r, c), t.memoizedState = Jc, Rc(null, i)) : (Po(), t.child = e.child, t.flags |= 128, null);
		if (jo(t), sm(a)) {
			if (r = a.nextSibling && a.nextSibling.dataset, r) var l = r.dgst;
			return r = l, r !== "" && (i = Error(s(419)), i.stack = "", i.digest = r, pa({
				value: i,
				source: null,
				stack: null
			})), el(e, t, c);
		}
		if (Mc || xa(e, t, c, !1), r = (c & e.childLanes) !== 0, Mc || r) {
			if (wo.current !== null) return el(e, t, c);
			if (r = q, r !== null && (i = bt(r, c), i !== 0 && i !== o.retryLane)) throw o.retryLane = i, Di(e, i), Pd(r, e, i), jc;
			return om(a) || Kd(), el(e, t, c);
		}
		return om(a) ? (t.flags |= 192, t.child = e.child, null) : (e = o.treeContext, B = lm(a.nextSibling), ra = t, V = !0, ia = null, aa = !1, e !== null && na(t, e), t = Qc(t, i.children), t.flags |= 134221824, t);
	}
	function nl(e, t, n) {
		e.lanes |= t;
		var r = e.alternate;
		r !== null && (r.lanes |= t), ya(e.return, t, n);
	}
	function rl(e) {
		for (var t = null; e !== null;) {
			var n = e.alternate;
			n !== null && zo(n) === null && (t = e), e = e.sibling;
		}
		return t;
	}
	function il(e, t, n, r, i, a) {
		var o = e.memoizedState;
		o === null ? e.memoizedState = {
			isBackwards: t,
			rendering: null,
			renderingStartTime: 0,
			last: r,
			tail: n,
			tailMode: i,
			treeForkCount: a
		} : (o.isBackwards = t, o.rendering = null, o.renderingStartTime = 0, o.last = r, o.tail = n, o.tailMode = i, o.treeForkCount = a);
	}
	function al(e) {
		var t = e.child;
		for (e.child = null; t !== null;) {
			var n = t.sibling;
			t.sibling = e.child, e.child = t, t = n;
		}
	}
	function ol(e, t, n) {
		var r = t.pendingProps, i = r.revealOrder, a = r.tail;
		r = r.children;
		var o = Io.current;
		if (t.flags & 128) return Lo(t, o), null;
		var s = !!(o & 2);
		if (s ? (o = o & 1 | 2, t.flags |= 128) : o &= 1, Lo(t, o), i === "backwards" && e !== null ? (al(e), Nc(e, t, r, n), al(e)) : Nc(e, t, r, n), r = V ? Ki : 0, !s && e !== null && e.flags & 128) a: for (e = t.child; e !== null;) {
			if (e.tag === 13) e.memoizedState !== null && nl(e, n, t);
			else if (e.tag === 19) nl(e, n, t);
			else if (e.child !== null) {
				e.child.return = e, e = e.child;
				continue;
			}
			if (e === t) break a;
			for (; e.sibling === null;) {
				if (e.return === null || e.return === t) break a;
				e = e.return;
			}
			e.sibling.return = e.return, e = e.sibling;
		}
		switch (i) {
			case "backwards":
				n = rl(t.child), n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null, al(t)), il(t, !0, i, null, a, r);
				break;
			case "unstable_legacy-backwards":
				for (n = null, i = t.child, t.child = null; i !== null;) {
					if (e = i.alternate, e !== null && zo(e) === null) {
						t.child = i;
						break;
					}
					e = i.sibling, i.sibling = n, n = i, i = e;
				}
				il(t, !0, n, null, a, r);
				break;
			case "together":
				il(t, !1, null, null, void 0, r);
				break;
			case "independent":
				t.memoizedState = null;
				break;
			default: n = rl(t.child), n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), il(t, !1, i, n, a, r);
		}
		return t.child;
	}
	function sl(e, t, n) {
		var r = t.pendingProps;
		return _a(t, t.type, r.value), Nc(e, t, r.children, n), t.child;
	}
	function cl(e, t, n) {
		if (e !== null && (t.dependencies = e.dependencies), od |= t.lanes, (n & t.childLanes) === 0) {
			if (e !== null) {
				if (xa(e, t, n, !1), (n & t.childLanes) === 0) return null;
			} else return null;
		}
		if (e !== null && t.child !== e.child) throw Error(s(153));
		if (t.child !== null) {
			for (e = t.child, n = Pi(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;) e = e.sibling, n = n.sibling = Pi(e, e.pendingProps), n.return = t;
			n.sibling = null;
		}
		return t.child;
	}
	function ll(e, t) {
		return (e.lanes & t) !== 0 || (e = e.dependencies, !!(e !== null && Sa(e)));
	}
	function ul(e, t, n) {
		switch (t.tag) {
			case 3:
				Oe(t, t.stateNode.containerInfo), _a(t, ka, e.memoizedState.cache), da();
				break;
			case 27:
			case 5:
				Ae(t);
				break;
			case 4:
				Oe(t, t.stateNode.containerInfo);
				break;
			case 10:
				_a(t, t.type, t.memoizedProps.value);
				break;
			case 31:
				if (t.memoizedState !== null) return t.flags |= 128, Mo(t), null;
				break;
			case 13:
				var r = t.memoizedState;
				if (r !== null) {
					if (r.dehydrated !== null) return jo(t), t.flags |= 128, null;
					r = xa(e, t, n, !1);
					var i = t.child.childLanes;
					return r || (n & i) !== 0 ? Zc(e, t, n) : (jo(t), e = cl(e, t, n), e === null ? null : e.sibling);
				}
				jo(t);
				break;
			case 19:
				if (t.flags & 128) return ol(e, t, n);
				if (i = !!(e.flags & 128), r = (n & t.childLanes) !== 0, r ||= (xa(e, t, n, !1), (n & t.childLanes) !== 0), i) {
					if (r) return ol(e, t, n);
					t.flags |= 128;
				}
				if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), Lo(t, Io.current), r) break;
				return null;
			case 22: return t.lanes = 0, Lc(e, t, n, t.pendingProps);
			case 24: _a(t, ka, e.memoizedState.cache);
		}
		return cl(e, t, n);
	}
	function dl(e, t, n) {
		if (e !== null) {
			if (e.memoizedProps !== t.pendingProps) Mc = !0;
			else {
				if (!ll(e, n) && !(t.flags & 128)) return Mc = !1, ul(e, t, n);
				Mc = !!(e.flags & 131072);
			}
		} else Mc = !1, V && t.flags & 1048576 && $i(t, Ki, t.index);
		switch (t.lanes = 0, t.tag) {
			case 16:
				a: {
					var r = t.pendingProps;
					if (e = $a(t.elementType), t.type = e, typeof e == "function") Ni(e) ? (r = xc(e, r), t.tag = 1, t = Kc(null, t, e, r, n)) : (t.tag = 0, t = Wc(null, t, e, r, n));
					else {
						if (e != null) {
							var i = e.$$typeof;
							if (i === ie) {
								t.tag = 11, t = Pc(null, t, e, r, n);
								break a;
							}
							if (i === se) {
								t.tag = 14, t = Fc(null, t, e, r, n);
								break a;
							}
							if (i === re) {
								t.tag = 10, t.type = e, t = sl(null, t, n);
								break a;
							}
						}
						throw t = _e(e) || e, Error(s(306, t, ""));
					}
				}
				return t;
			case 0: return Wc(e, t, t.type, t.pendingProps, n);
			case 1: return r = t.type, i = xc(r, t.pendingProps), Kc(e, t, r, i, n);
			case 3:
				a: {
					if (Oe(t, t.stateNode.containerInfo), e === null) throw Error(s(387));
					r = t.pendingProps;
					var a = t.memoizedState;
					i = a.element, mo(e, t), xo(t, r, null, n);
					var o = t.memoizedState;
					if (r = o.cache, _a(t, ka, r), r !== a.cache && ba(t, [ka], n, !0), bo(), r = o.element, a.isDehydrated) {
						if (a = {
							element: r,
							isDehydrated: !1,
							cache: o.cache
						}, t.updateQueue.baseState = a, t.memoizedState = a, t.flags & 256) {
							t = qc(e, t, r, n);
							break a;
						}
						if (r !== i) {
							i = Hi(Error(s(424)), t), pa(i), t = qc(e, t, r, n);
							break a;
						}
						switch (e = t.stateNode.containerInfo, e.nodeType) {
							case 9:
								e = e.body;
								break;
							default: e = e.nodeName === "HTML" ? e.ownerDocument.body : e;
						}
						for (B = lm(e.firstChild), ra = t, V = !0, ia = null, aa = !0, n = uo(t, null, r, n), t.child = n; n;) n.flags = n.flags & -3 | 134221824, n = n.sibling;
					} else {
						if (da(), r === i) {
							t = cl(e, t, n);
							break a;
						}
						Nc(e, t, r, n);
					}
					t = t.child;
				}
				return t;
			case 26: return Uc(e, t), e === null ? (n = Nm(t.type, null, t.pendingProps, null)) ? t.memoizedState = n : V || (t.stateNode = fp(t.type, t.pendingProps, Ee.current, t)) : t.memoizedState = Nm(t.type, e.memoizedProps, t.pendingProps, e.memoizedState), null;
			case 27: return Ae(t), e === null && V && (r = t.stateNode = hm(t.type, t.pendingProps, Ee.current), ra = t, aa = !0, i = B, Sp(t.type) ? (um = i, B = lm(r.firstChild)) : B = i), Nc(e, t, t.pendingProps.children, n), Uc(e, t), e === null && (t.flags |= 4194304), t.child;
			case 5: return e === null && V && ((i = r = B) && (r = rm(r, t.type, t.pendingProps, aa), r === null ? i = !1 : (t.stateNode = r, ra = t, B = lm(r.firstChild), aa = !1, i = !0)), i || sa(t)), Ae(t), i = t.type, a = t.pendingProps, o = e === null ? null : e.memoizedProps, r = a.children, pp(i, a) ? r = null : o !== null && pp(i, o) && (t.flags |= 32), t.memoizedState !== null && (i = Zo(e, t, es, null, null, n), sh._currentValue = i), Uc(e, t), Nc(e, t, r, n), t.child;
			case 6: return e === null && V && ((e = n = B) && (n = im(n, t.pendingProps, aa), n === null ? e = !1 : (t.stateNode = n, ra = t, B = null, e = !0)), e || sa(t)), null;
			case 13: return Zc(e, t, n);
			case 4: return Oe(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = lo(t, null, r, n) : Nc(e, t, r, n), t.child;
			case 11: return Pc(e, t, t.type, t.pendingProps, n);
			case 7: return r = t.pendingProps, Uc(e, t), Nc(e, t, r, n), t.child;
			case 8: return Nc(e, t, t.pendingProps.children, n), t.child;
			case 12: return Nc(e, t, t.pendingProps.children, n), t.child;
			case 10: return sl(e, t, n);
			case 9: return i = t.type._context, r = t.pendingProps.children, Ca(t), i = wa(i), r = r(i), t.flags |= 1, Nc(e, t, r, n), t.child;
			case 14: return Fc(e, t, t.type, t.pendingProps, n);
			case 15: return Ic(e, t, t.type, t.pendingProps, n);
			case 19: return ol(e, t, n);
			case 31: return Hc(e, t, n);
			case 22: return Lc(e, t, n, t.pendingProps);
			case 24: return Ca(t), r = wa(ka), e === null ? (i = Wa(), i === null && (i = q, a = Aa(), i.pooledCache = a, a.refCount++, a !== null && (i.pooledCacheLanes |= n), i = a), t.memoizedState = {
				parent: r,
				cache: i
			}, po(t), _a(t, ka, i)) : ((e.lanes & n) !== 0 && (mo(e, t), xo(t, null, null, n), bo()), i = e.memoizedState, a = t.memoizedState, i.parent === r ? (r = a.cache, _a(t, ka, r), r !== i.cache && ba(t, [ka], n, !0)) : (i = {
				parent: r,
				cache: r
			}, t.memoizedState = i, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = i), _a(t, ka, r))), Nc(e, t, t.pendingProps.children, n), t.child;
			case 30: return t.stateNode === null && (t.stateNode = {
				autoName: null,
				paired: null,
				clones: null,
				ref: null
			}), r = t.pendingProps, r.name != null && r.name !== "auto" ? t.flags |= e === null ? 18882560 : 18874368 : V && ea(t), e !== null && e.memoizedProps.name !== r.name ? t.flags |= 4194816 : Uc(e, t), Nc(e, t, r.children, n), t.child;
			case 29: throw t.pendingProps;
		}
		throw Error(s(156, t.tag));
	}
	function fl(e) {
		e.flags |= 4;
	}
	function pl(e, t, n, r, i) {
		var a;
		if ((a = !!(e.mode & 32)) && (a = n === null ? Jm(t, r) : Jm(t, r) && (r.src !== n.src || r.srcSet !== n.srcSet)), a) {
			if (e.flags |= 16777216, (i & 335544128) === i) {
				if (e.stateNode.complete) e.flags |= 8192;
				else if (Ud()) e.flags |= 8192;
				else throw eo = Xa, Ja;
			}
		} else e.flags &= -16777217;
	}
	function ml(e, t) {
		if (t.type !== "stylesheet" || t.state.loading & 4) e.flags &= -16777217;
		else if (e.flags |= 16777216, !Ym(t)) {
			if (Ud()) e.flags |= 8192;
			else throw eo = Xa, Ja;
		}
	}
	function hl(e, t) {
		t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag === 22 ? 536870912 : mt(), e.lanes |= t, ud |= t);
	}
	function gl(e, t) {
		if (!V) switch (e.tailMode) {
			case "visible": break;
			case "collapsed":
				for (var n = e.tail, r = null; n !== null;) n.alternate !== null && (r = n), n = n.sibling;
				r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
				break;
			default:
				for (t = e.tail, n = null; t !== null;) t.alternate !== null && (n = t), t = t.sibling;
				n === null ? e.tail = null : n.sibling = null;
		}
	}
	function _l(e) {
		var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
		if (t) for (var i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags & 1206910976, r |= i.flags & 1206910976, i.return = e, i = i.sibling;
		else for (i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags, r |= i.flags, i.return = e, i = i.sibling;
		return e.subtreeFlags |= r, e.childLanes = n, t;
	}
	function vl(e, t, n) {
		var r = t.pendingProps;
		switch (ta(t), t.tag) {
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14: return _l(t), null;
			case 1: return _l(t), null;
			case 3: return n = t.stateNode, r = null, e !== null && (r = e.memoizedState.cache), t.memoizedState.cache !== r && (t.flags |= 2048), va(ka), ke(), n.pendingContext && (n.context = n.pendingContext, n.pendingContext = null), (e === null || e.child === null) && (ua(t) ? fl(t) : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, fa())), _l(t), null;
			case 26:
				var i = t.type, a = t.memoizedState;
				return e === null ? (fl(t), a === null ? (_l(t), pl(t, i, null, r, n)) : (_l(t), ml(t, a))) : a ? a === e.memoizedState ? (_l(t), t.flags &= -16777217) : (fl(t), _l(t), ml(t, a)) : (e = e.memoizedProps, e !== r && fl(t), _l(t), pl(t, i, e, r, n)), null;
			case 27:
				if (je(t), n = Ee.current, i = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && fl(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(s(166));
						return _l(t), t.subtreeFlags &= -33554433, null;
					}
					e = we.current, ua(t) ? ca(t, e) : (e = hm(i, r, n), t.stateNode = e, fl(t));
				}
				return _l(t), t.subtreeFlags &= -33554433, null;
			case 5:
				if (je(t), i = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && fl(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(s(166));
						return _l(t), t.subtreeFlags &= -33554433, null;
					}
					if (a = we.current, ua(t)) ca(t, a);
					else {
						var o = lp(Ee.current);
						switch (a) {
							case 1:
								a = o.createElementNS("http://www.w3.org/2000/svg", i);
								break;
							case 2:
								a = o.createElementNS("http://www.w3.org/1998/Math/MathML", i);
								break;
							default: switch (i) {
								case "svg":
									a = o.createElementNS("http://www.w3.org/2000/svg", i);
									break;
								case "math":
									a = o.createElementNS("http://www.w3.org/1998/Math/MathML", i);
									break;
								case "script":
									a = o.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild);
									break;
								case "select":
									a = typeof r.is == "string" ? o.createElement("select", { is: r.is }) : o.createElement("select"), r.multiple ? a.multiple = !0 : r.size && (a.size = r.size);
									break;
								default: a = typeof r.is == "string" ? o.createElement(i, { is: r.is }) : o.createElement(i);
							}
						}
						a[F] = t, a[Et] = r;
						a: for (o = t.child; o !== null;) {
							if (o.tag === 5 || o.tag === 6) a.appendChild(o.stateNode);
							else if (o.tag !== 4 && o.tag !== 27 && o.child !== null) {
								o.child.return = o, o = o.child;
								continue;
							}
							if (o === t) break a;
							for (; o.sibling === null;) {
								if (o.return === null || o.return === t) break a;
								o = o.return;
							}
							o.sibling.return = o.return, o = o.sibling;
						}
						t.stateNode = a;
						a: switch (np(a, i, r), i) {
							case "button":
							case "input":
							case "select":
							case "textarea":
								r = !!r.autoFocus;
								break a;
							case "img":
								r = !0;
								break a;
							default: r = !1;
						}
						r && fl(t);
					}
				}
				return _l(t), t.subtreeFlags &= -33554433, pl(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n), null;
			case 6:
				if (e && t.stateNode != null) e.memoizedProps !== r && fl(t);
				else {
					if (typeof r != "string" && t.stateNode === null) throw Error(s(166));
					if (e = Ee.current, ua(t)) {
						if (e = t.stateNode, n = t.memoizedProps, r = null, i = ra, i !== null) switch (i.tag) {
							case 27:
							case 5: r = i.memoizedProps;
						}
						e[F] = t, e = !!(e.nodeValue === n || r !== null && !0 === r.suppressHydrationWarning || ep(e.nodeValue, n)), e || sa(t, !0);
					} else e = lp(e).createTextNode(r), e[F] = t, t.stateNode = e;
				}
				return _l(t), null;
			case 31:
				if (n = t.memoizedState, e === null || e.memoizedState !== null) {
					if (r = ua(t), n !== null) {
						if (e === null) {
							if (!r) throw Error(s(318));
							if (e = t.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(557));
							e[F] = t;
						} else da(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						_l(t), e = !1;
					} else n = fa(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n), e = !0;
					if (!e) return t.flags & 256 ? (Fo(t), t) : (Fo(t), null);
					if (t.flags & 128) throw Error(s(558));
				}
				return _l(t), null;
			case 13:
				if (r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
					if (i = ua(t), r !== null && r.dehydrated !== null) {
						if (e === null) {
							if (!i) throw Error(s(318));
							if (i = t.memoizedState, i = i === null ? null : i.dehydrated, !i) throw Error(s(317));
							i[F] = t;
						} else da(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						_l(t), i = !1;
					} else i = fa(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = i), i = !0;
					if (!i) return t.flags & 256 ? (Fo(t), t) : (Fo(t), null);
				}
				return Fo(t), t.flags & 128 ? (t.lanes = n, t) : (n = r !== null, e = e !== null && e.memoizedState !== null, n && (r = t.child, i = null, r.alternate !== null && r.alternate.memoizedState !== null && r.alternate.memoizedState.cachePool !== null && (i = r.alternate.memoizedState.cachePool.pool), a = null, r.memoizedState !== null && r.memoizedState.cachePool !== null && (a = r.memoizedState.cachePool.pool), a !== i && (r.flags |= 2048)), n !== e && n && (t.child.flags |= 8192), hl(t, t.updateQueue), _l(t), null);
			case 4: return ke(), e === null && Wf(t.stateNode.containerInfo), t.flags |= 67108864, _l(t), null;
			case 10: return va(t.type), _l(t), null;
			case 19:
				if (Ro(t), r = t.memoizedState, r === null) return _l(t), null;
				if (i = !!(t.flags & 128), a = r.rendering, a === null) {
					if (i) gl(r, !1);
					else {
						if (ad !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null;) {
							if (a = zo(e), a !== null) {
								for (t.flags |= 128, gl(r, !1), e = a.updateQueue, t.updateQueue = e, hl(t, e), t.subtreeFlags = 0, e = n, n = t.child; n !== null;) Fi(n, e), n = n.sibling;
								return Lo(t, Io.current & 1 | 2), V && Qi(t, r.treeForkCount), t.child;
							}
							e = e.sibling;
						}
						r.tail !== null && We() > gd && (t.flags |= 128, i = !0, gl(r, !1), t.lanes = 4194304);
					}
				} else {
					if (!i) {
						if (e = zo(a), e !== null) {
							if (t.flags |= 128, i = !0, e = e.updateQueue, t.updateQueue = e, hl(t, e), gl(r, !0), r.tail === null && r.tailMode !== "collapsed" && r.tailMode !== "visible" && !a.alternate && !V) return _l(t), null;
						} else 2 * We() - r.renderingStartTime > gd && n !== 536870912 && (t.flags |= 128, i = !0, gl(r, !1), t.lanes = 4194304);
					}
					r.isBackwards ? (a.sibling = t.child, t.child = a) : (e = r.last, e === null ? t.child = a : e.sibling = a, r.last = a);
				}
				if (r.tail !== null) {
					e = r.tail;
					a: {
						for (n = e; n !== null;) {
							if (n.alternate !== null) {
								n = !1;
								break a;
							}
							n = n.sibling;
						}
						n = !0;
					}
					return r.rendering = e, r.tail = e.sibling, r.renderingStartTime = We(), e.sibling = null, a = Io.current, a = i ? a & 1 | 2 : a & 1, r.tailMode === "visible" || r.tailMode === "collapsed" || !n || V ? Lo(t, a) : (n = a, P(ko, t), P(Io, n), Ao === null && (Ao = t)), V && Qi(t, r.treeForkCount), e;
				}
				return _l(t), null;
			case 22:
			case 23: return Fo(t), Oo(), r = t.memoizedState !== null, e === null ? r && (t.flags |= 8192) : e.memoizedState !== null !== r && (t.flags |= 8192), r ? n & 536870912 && !(t.flags & 128) && (_l(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : _l(t), n = t.updateQueue, n !== null && hl(t, n.retryQueue), n = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), r = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (r = t.memoizedState.cachePool.pool), r !== n && (t.flags |= 2048), e !== null && Ce(Ua), null;
			case 24: return n = null, e !== null && (n = e.memoizedState.cache), t.memoizedState.cache !== n && (t.flags |= 2048), va(ka), _l(t), null;
			case 25: return null;
			case 30: return t.flags |= 33554432, _l(t), null;
		}
		throw Error(s(156, t.tag));
	}
	function yl(e, t) {
		switch (ta(t), t.tag) {
			case 1: return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 3: return va(ka), ke(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
			case 26:
			case 27:
			case 5: return je(t), null;
			case 31:
				if (t.memoizedState !== null) {
					if (Fo(t), t.alternate === null) throw Error(s(340));
					da();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 13:
				if (Fo(t), e = t.memoizedState, e !== null && e.dehydrated !== null) {
					if (t.alternate === null) throw Error(s(340));
					da();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 19: return Ro(t), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null), t.flags |= 4, t) : null;
			case 4: return ke(), null;
			case 10: return va(t.type), null;
			case 22:
			case 23: return Fo(t), Oo(), e !== null && Ce(Ua), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 24: return va(ka), null;
			case 25: return null;
			default: return null;
		}
	}
	function bl(e, t) {
		switch (ta(t), t.tag) {
			case 3:
				va(ka), ke();
				break;
			case 26:
			case 27:
			case 5:
				je(t);
				break;
			case 4:
				ke();
				break;
			case 31:
				t.memoizedState !== null && Fo(t);
				break;
			case 13:
				Fo(t);
				break;
			case 19:
				Ro(t);
				break;
			case 10:
				va(t.type);
				break;
			case 22:
			case 23:
				Fo(t), Oo(), e !== null && Ce(Ua);
				break;
			case 24: va(ka);
		}
	}
	function xl(e, t) {
		try {
			var n = t.updateQueue, r = n === null ? null : n.lastEffect;
			if (r !== null) {
				var i = r.next;
				n = i;
				do {
					if ((n.tag & e) === e) {
						r = void 0;
						var a = n.create, o = n.inst;
						r = a(), o.destroy = r;
					}
					n = n.next;
				} while (n !== i);
			}
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function Sl(e, t, n) {
		try {
			var r = t.updateQueue, i = r === null ? null : r.lastEffect;
			if (i !== null) {
				var a = i.next;
				r = a;
				do {
					if ((r.tag & e) === e) {
						var o = r.inst, s = o.destroy;
						if (s !== void 0) {
							o.destroy = void 0, i = t;
							var c = n, l = s;
							try {
								l();
							} catch (e) {
								Z(i, c, e);
							}
						}
					}
					r = r.next;
				} while (r !== a);
			}
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function Cl(e) {
		var t = e.updateQueue;
		if (t !== null) {
			var n = e.stateNode;
			try {
				Co(t, n);
			} catch (t) {
				Z(e, e.return, t);
			}
		}
	}
	function wl(e, t, n) {
		n.props = xc(e.type, e.memoizedProps), n.state = e.memoizedState;
		try {
			n.componentWillUnmount();
		} catch (n) {
			Z(e, t, n);
		}
	}
	function Tl(e, t) {
		try {
			var n = e.ref;
			if (n !== null) {
				switch (e.tag) {
					case 26:
					case 27:
					case 5:
						var r = e.stateNode;
						break;
					case 30:
						var i = e.stateNode, a = _i(e.memoizedProps, i);
						(i.ref === null || i.ref.name !== a) && (i.ref = Pp(a)), r = i.ref;
						break;
					case 7:
						if (e.stateNode === null) {
							var o = new Fp(e);
							h(e.child, !1, Qp, o, void 0, void 0), e.stateNode = o;
						}
						r = e.stateNode;
						break;
					default: r = e.stateNode;
				}
				typeof n == "function" ? e.refCleanup = n(r) : n.current = r;
			}
		} catch (n) {
			Z(e, t, n);
		}
	}
	function El(e, t) {
		var n = e.ref, r = e.refCleanup;
		if (n !== null) {
			if (typeof r == "function") try {
				r();
			} catch (n) {
				Z(e, t, n);
			} finally {
				e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null);
			}
			else if (typeof n == "function") try {
				n(null);
			} catch (n) {
				Z(e, t, n);
			}
			else n.current = null;
		}
	}
	function Dl(e, t) {
		if ((e.tag === 5 || e.tag === 27 || e.tag === 6) && e.alternate === null && t !== null) for (var n = 0; n < t.length; n++) em(e.stateNode, t[n]);
	}
	function Ol(e) {
		for (var t = e.return; t !== null && (jl(t) && em(e.stateNode, t.stateNode), !Al(t));) t = t.return;
	}
	function kl(e) {
		for (var t = e.return; t !== null && (jl(t) && tm(e.stateNode, t.stateNode), !Al(t));) t = t.return;
	}
	function Al(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 27;
	}
	function jl(e) {
		return e && e.tag === 7 && e.stateNode !== null;
	}
	function Ml(e) {
		var t = e.type, n = e.memoizedProps, r = e.stateNode;
		try {
			a: switch (t) {
				case "button":
				case "input":
				case "select":
				case "textarea":
					n.autoFocus && r.focus();
					break a;
				case "img": n.src ? r.src = n.src : n.srcSet && (r.srcset = n.srcSet);
			}
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	function Nl(e, t, n) {
		try {
			var r = e.stateNode;
			ip(r, e.type, n, t), r[Et] = t;
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	function Pl(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && Sp(e.type) || e.tag === 4;
	}
	function Fl(e) {
		a: for (;;) {
			for (; e.sibling === null;) {
				if (e.return === null || Pl(e.return)) return null;
				e = e.return;
			}
			for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;) {
				if (e.tag === 27 && Sp(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue a;
				e.child.return = e, e = e.child;
			}
			if (!(e.flags & 2)) return e.stateNode;
		}
	}
	function Il(e, t, n, r) {
		var i = e.tag;
		if (i === 5 || i === 6) i = e.stateNode, t ? (n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n).insertBefore(i, t) : (t = n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n, t.appendChild(i), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = yn)), Dl(e, r), I = !0;
		else if (i !== 4 && (i === 27 && (Dl(e, r), r = null, Sp(e.type) && (n = e.stateNode, t = null)), e = e.child, e !== null)) for (Il(e, t, n, r), e = e.sibling; e !== null;) Il(e, t, n, r), e = e.sibling;
	}
	function Ll(e, t, n, r) {
		var i = e.tag;
		if (i === 5 || i === 6) i = e.stateNode, t ? n.insertBefore(i, t) : n.appendChild(i), Dl(e, r), I = !0;
		else if (i !== 4 && (i === 27 && (Dl(e, r), r = null, Sp(e.type) && (n = e.stateNode)), e = e.child, e !== null)) for (Ll(e, t, n, r), e = e.sibling; e !== null;) Ll(e, t, n, r), e = e.sibling;
	}
	function Rl(e) {
		var t = e.stateNode, n = e.memoizedProps;
		try {
			for (var r = e.type, i = t.attributes; i.length;) t.removeAttributeNode(i[0]);
			np(t, r, n), t[F] = e, t[Et] = n;
		} catch (t) {
			Z(e, e.return, t);
		}
	}
	var zl = !1, Bl = null;
	function Vl(e) {
		(e.tag === 30 || e.subtreeFlags & 33554432) && (zl = !0);
	}
	var Hl = null;
	function Ul() {
		var e = Hl;
		return Hl = null, e;
	}
	var Wl = 0;
	function Gl(e, t, n, r, i) {
		return Wl = 0, Kl(e.child, t, n, r, i);
	}
	function Kl(e, t, n, r, i) {
		for (var a = !1; e !== null;) {
			if (e.tag === 5) {
				var o = e.stateNode;
				if (r !== null) {
					var s = Op(o);
					r.push(s), s.view && (a = !0);
				} else a || Op(o).view && (a = !0);
				zl = !0, Tp(o, Wl === 0 ? t : t + "_" + Wl, n), Wl++;
			} else e.tag === 22 && e.memoizedState !== null || e.tag === 30 && i || Kl(e.child, t, n, r, i) && (a = !0);
			e = e.sibling;
		}
		return a;
	}
	function ql(e, t) {
		for (; e !== null;) e.tag === 5 ? Ep(e.stateNode, e.memoizedProps) : e.tag === 22 && e.memoizedState !== null || e.tag === 30 && t || ql(e.child, t), e = e.sibling;
	}
	function Jl(e) {
		if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
			if ((e.tag !== 22 || e.memoizedState === null) && (Jl(e), e.tag === 30 && e.flags & 18874368 && e.stateNode.paired)) {
				var t = e.memoizedProps;
				if (t.name == null || t.name === "auto") throw Error(s(544));
				var n = t.name;
				t = yi(t.default, t.share), t !== "none" && (Gl(e, n, t, null, !1) || ql(e.child, !1));
			}
			e = e.sibling;
		}
	}
	function Yl(e, t) {
		if (e.tag === 30) {
			var n = e.stateNode, r = e.memoizedProps, i = _i(r, n), a = yi(r.default, n.paired ? r.share : r.enter);
			a === "none" ? Jl(e) : Gl(e, i, a, null, !1) ? (Jl(e), n.paired || t || Nd(e, r.onEnter)) : ql(e.child, !1);
		} else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) Yl(e, t), e = e.sibling;
		else Jl(e);
	}
	function Xl(e) {
		if (Bl !== null && Bl.size !== 0) {
			var t = Bl;
			if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
				if (e.tag !== 22 || e.memoizedState === null) {
					if (e.tag === 30 && e.flags & 18874368) {
						var n = e.memoizedProps, r = n.name;
						if (r != null && r !== "auto") {
							var i = t.get(r);
							if (i !== void 0) {
								var a = yi(n.default, n.share);
								if (a !== "none" && (Gl(e, r, a, null, !1) ? (a = e.stateNode, i.paired = a, a.paired = i, Nd(e, n.onShare)) : ql(e.child, !1)), t.delete(r), t.size === 0) break;
							}
						}
					}
					Xl(e);
				}
				e = e.sibling;
			}
		}
	}
	function Zl(e) {
		if (e.tag === 30) {
			var t = e.memoizedProps, n = _i(t, e.stateNode), r = Bl === null ? void 0 : Bl.get(n), i = yi(t.default, r === void 0 ? t.exit : t.share);
			i !== "none" && (Gl(e, n, i, null, !1) ? r === void 0 ? Nd(e, t.onExit) : (i = e.stateNode, r.paired = i, i.paired = r, Bl.delete(n), Nd(e, t.onShare)) : ql(e.child, !1)), Bl !== null && Xl(e);
		} else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) Zl(e), e = e.sibling;
		else Bl !== null && Xl(e);
	}
	function Ql(e) {
		for (e = e.child; e !== null;) {
			if (e.tag === 30) {
				var t = e.memoizedProps, n = _i(t, e.stateNode);
				t = yi(t.default, t.update), e.flags &= -5, t !== "none" && Gl(e, n, t, e.memoizedState = [], !1);
			} else e.subtreeFlags & 33554432 && Ql(e);
			e = e.sibling;
		}
	}
	function $l(e) {
		if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
			if (e.tag !== 22 || e.memoizedState === null) {
				if (e.tag === 30 && e.flags & 18874368) {
					var t = e.stateNode;
					t.paired !== null && (t.paired = null, ql(e.child, !1));
				}
				$l(e);
			}
			e = e.sibling;
		}
	}
	function eu(e) {
		if (e.tag === 30) e.stateNode.paired = null, ql(e.child, !1), $l(e);
		else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) eu(e), e = e.sibling;
		else $l(e);
	}
	function tu(e) {
		for (e = e.child; e !== null;) e.tag === 30 ? ql(e.child, !1) : e.subtreeFlags & 33554432 && tu(e), e = e.sibling;
	}
	function nu(e, t, n, r, i, a, o) {
		for (var s = !1; t !== null;) {
			if (t.tag === 5) {
				var c = t.stateNode;
				if (a !== null && Wl < a.length) {
					var l = a[Wl], u = Op(c);
					(l.view || u.view) && (s = !0);
					var d;
					if (d = !(e.flags & 4)) {
						if (u.clip) d = !0;
						else {
							d = l.rect;
							var f = u.rect;
							d = d.y !== f.y || d.x !== f.x || d.height !== f.height || d.width !== f.width;
						}
					}
					d && (e.flags |= 4), u.abs ? u = !l.abs : (l = l.rect, u = u.rect, u = l.height !== u.height || l.width !== u.width), u && (e.flags |= 32);
				} else e.flags |= 32;
				e.flags & 4 && Tp(c, Wl === 0 ? n : n + "_" + Wl, i), s && e.flags & 4 || (Hl === null && (Hl = []), Hl.push(c, Wl === 0 ? r : r + "_" + Wl, t.memoizedProps)), Wl++;
			} else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && o ? e.flags |= t.flags & 32 : nu(e, t.child, n, r, i, a, o) && (s = !0));
			t = t.sibling;
		}
		return s;
	}
	function ru(e, t) {
		for (e = e.child; e !== null;) {
			if (e.tag === 30) {
				var n = e.memoizedProps, r = e.stateNode, i = _i(n, r), a = yi(n.default, n.update);
				if (t) {
					r = r.clones;
					var o = r === null ? null : r.map(kp);
				} else o = e.memoizedState, e.memoizedState = null;
				r = e;
				var s = e.child;
				Wl = 0, i = nu(r, s, i, i, a, o, !1), e.flags & 4 && i && (t || Nd(e, n.onUpdate));
			} else e.subtreeFlags & 33554432 && ru(e, t);
			e = e.sibling;
		}
	}
	var iu = !1, G = !1, au = !1, ou = !1, su = typeof WeakSet == "function" ? WeakSet : Set, cu = null, lu = !1, uu = !1, du = !1, fu = !1;
	function pu(e, t, n) {
		if (e = e.containerInfo, sp = gh, e = qr(e), Jr(e)) {
			if ("selectionStart" in e) var r = {
				start: e.selectionStart,
				end: e.selectionEnd
			};
			else a: {
				r = (r = e.ownerDocument) && r.defaultView || window;
				var i = r.getSelection && r.getSelection();
				if (i && i.rangeCount !== 0) {
					r = i.anchorNode;
					var a = i.anchorOffset, o = i.focusNode;
					i = i.focusOffset;
					try {
						r.nodeType, o.nodeType;
					} catch {
						r = null;
						break a;
					}
					var s = 0, c = -1, l = -1, u = 0, d = 0, f = e, p = null;
					b: for (;;) {
						for (var m; f !== r || a !== 0 && f.nodeType !== 3 || (c = s + a), f !== o || i !== 0 && f.nodeType !== 3 || (l = s + i), f.nodeType === 3 && (s += f.nodeValue.length), (m = f.firstChild) !== null;) p = f, f = m;
						for (;;) {
							if (f === e) break b;
							if (p === r && ++u === a && (c = s), p === o && ++d === i && (l = s), (m = f.nextSibling) !== null) break;
							f = p, p = f.parentNode;
						}
						f = m;
					}
					r = c === -1 || l === -1 ? null : {
						start: c,
						end: l
					};
				} else r = null;
			}
			r ||= {
				start: 0,
				end: 0
			};
		} else r = null;
		for (cp = {
			focusedElem: e,
			selectionRange: r
		}, gh = !1, n = (n & 335544064) === n, cu = t, t = n ? 9270 : 1024; cu !== null;) {
			if (e = cu, n && (r = e.deletions, r !== null)) for (a = 0; a < r.length; a++) n && Zl(r[a]);
			if (e.alternate === null && e.flags & 2) n && Vl(e), mu(n);
			else {
				if (e.tag === 22) {
					if (r = e.alternate, e.memoizedState !== null) {
						r !== null && r.memoizedState === null && n && Zl(r), mu(n);
						continue;
					}
					if (r !== null && r.memoizedState !== null) {
						n && Vl(e), mu(n);
						continue;
					}
				}
				r = e.child, (e.subtreeFlags & t) !== 0 && r !== null ? (r.return = e, cu = r) : (n && Ql(e), mu(n));
			}
		}
		Bl = null;
	}
	function mu(e) {
		for (; cu !== null;) {
			var t = cu, n = e, r = t.alternate, i = t.flags;
			switch (t.tag) {
				case 0:
				case 11:
				case 15: break;
				case 1:
					if (i & 1024 && r !== null) {
						n = void 0, i = r.memoizedProps, r = r.memoizedState;
						var a = t.stateNode;
						try {
							var o = xc(t.type, i);
							n = a.getSnapshotBeforeUpdate(o, r), a.__reactInternalSnapshotBeforeUpdate = n;
						} catch (e) {
							Z(t, t.return, e);
						}
					}
					break;
				case 3:
					if (i & 1024) {
						if (r = t.stateNode.containerInfo, n = r.nodeType, n === 9) nm(r);
						else if (n === 1) switch (r.nodeName) {
							case "HEAD":
							case "HTML":
							case "BODY":
								nm(r);
								break;
							default: r.textContent = "";
						}
					}
					break;
				case 5:
				case 26:
				case 27:
				case 6:
				case 4:
				case 17: break;
				case 30:
					n && r !== null && (n = _i(r.memoizedProps, r.stateNode), i = t.memoizedProps, i = yi(i.default, i.update), i !== "none" && Gl(r, n, i, r.memoizedState = [], !0));
					break;
				default: if (i & 1024) throw Error(s(163));
			}
			if (r = t.sibling, r !== null) {
				r.return = t.return, cu = r;
				break;
			}
			cu = t.return;
		}
	}
	function hu(e, t, n) {
		var r = n.flags;
		switch (n.tag) {
			case 0:
			case 11:
			case 15:
				Fu(e, n), r & 4 && xl(5, n);
				break;
			case 1:
				if (Fu(e, n), r & 4) {
					if (e = n.stateNode, t === null) try {
						e.componentDidMount();
					} catch (e) {
						Z(n, n.return, e);
					}
					else {
						var i = xc(n.type, t.memoizedProps);
						t = t.memoizedState;
						try {
							e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate);
						} catch (e) {
							Z(n, n.return, e);
						}
					}
				}
				r & 64 && Cl(n), r & 512 && Tl(n, n.return);
				break;
			case 3:
				if (Fu(e, n), r & 64 && (e = n.updateQueue, e !== null)) {
					if (t = null, n.child !== null) switch (n.child.tag) {
						case 27:
						case 5:
							t = n.child.stateNode;
							break;
						case 1: t = n.child.stateNode;
					}
					try {
						Co(e, t);
					} catch (e) {
						Z(n, n.return, e);
					}
				}
				break;
			case 27: t === null && r & 4 && Rl(n);
			case 26:
			case 5:
				Fu(e, n), t === null && r & 4 && Ml(n), r & 512 && Tl(n, n.return);
				break;
			case 12:
				Fu(e, n);
				break;
			case 31:
				Fu(e, n), r & 4 && wu(e, n);
				break;
			case 13:
				Fu(e, n), r & 4 && Tu(e, n), r & 64 && (e = n.memoizedState, e !== null && (e = e.dehydrated, e !== null && (n = _f.bind(null, n), cm(e, n))));
				break;
			case 22:
				if (r = n.memoizedState !== null || iu, !r) {
					var a = t !== null && t.memoizedState !== null || G;
					t = iu, i = G, iu = r, (G = a) && !i ? (r = 2, n.subtreeFlags & 8772 && (r |= 1), Lu(e, n, r)) : Fu(e, n), iu = t, G = i;
				}
				break;
			case 30:
				Fu(e, n), r & 512 && Tl(n, n.return);
				break;
			case 7: r & 512 && Tl(n, n.return);
			default: Fu(e, n);
		}
	}
	function gu(e, t) {
		for (e = e.child; e !== null;) _u(e, t), e = e.sibling;
	}
	function _u(e, t) {
		switch (e.tag) {
			case 5:
			case 26:
				try {
					var n = e.stateNode;
					if (t) {
						var r = n.style;
						typeof r.setProperty == "function" ? r.setProperty("display", "none", "important") : r.display = "none";
					} else {
						var i = e.stateNode, a = e.memoizedProps.style, o = a != null && a.hasOwnProperty("display") ? a.display : null;
						i.style.display = o == null || typeof o == "boolean" ? "" : ("" + o).trim();
					}
				} catch (t) {
					Z(e, e.return, t);
				}
				vu(e, t);
				break;
			case 6:
				try {
					e.stateNode.nodeValue = t ? "" : e.memoizedProps, I = !0;
				} catch (t) {
					Z(e, e.return, t);
				}
				break;
			case 18:
				try {
					var s = e.stateNode;
					t ? wp(s, !0) : wp(e.stateNode, !1);
				} catch (t) {
					Z(e, e.return, t);
				}
				break;
			case 22:
			case 23:
				e.memoizedState === null && gu(e, t);
				break;
			default: gu(e, t);
		}
	}
	function vu(e, t) {
		if (e.subtreeFlags & 67108864) for (e = e.child; e !== null;) {
			a: {
				var n = e, r = t;
				switch (n.tag) {
					case 4:
						_u(n, r);
						break a;
					case 22:
						n.memoizedState === null && vu(n, r);
						break a;
					default: vu(n, r);
				}
			}
			e = e.sibling;
		}
	}
	function yu(e) {
		var t = e.alternate;
		t !== null && (e.alternate = null, yu(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && Pt(t)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
	}
	var bu = null, xu = !1;
	function Su(e, t, n) {
		for (n = n.child; n !== null;) Cu(e, t, n), n = n.sibling;
	}
	function Cu(e, t, n) {
		if (et && typeof et.onCommitFiberUnmount == "function") try {
			et.onCommitFiberUnmount($e, n);
		} catch {}
		switch (n.tag) {
			case 26:
				G || El(n, t), Su(e, t, n), n.memoizedState ? n.memoizedState.count-- : n.stateNode && !G && (n = n.stateNode, n.parentNode.removeChild(n));
				break;
			case 27:
				G || El(n, t), kl(n);
				var r = bu, i = xu;
				Sp(n.type) && (bu = n.stateNode, xu = !1), Su(e, t, n), gm(n.stateNode, n.type, n.memoizedProps), bu = r, xu = i;
				break;
			case 5: G || El(n, t), kl(n);
			case 6:
				if (n.tag === 6 && kl(n), r = bu, i = xu, bu = null, Su(e, t, n), bu = r, xu = i, bu !== null) {
					if (xu) try {
						(bu.nodeType === 9 ? bu.body : bu.nodeName === "HTML" ? bu.ownerDocument.body : bu).removeChild(n.stateNode), I = !0;
					} catch (e) {
						Z(n, t, e);
					}
					else try {
						bu.removeChild(n.stateNode), I = !0;
					} catch (e) {
						Z(n, t, e);
					}
				}
				break;
			case 18:
				bu !== null && (xu ? (e = bu, Cp(e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, n.stateNode), Hh(e)) : Cp(bu, n.stateNode));
				break;
			case 4:
				r = bu, i = xu, bu = n.stateNode.containerInfo, xu = !0, Su(e, t, n), bu = r, xu = i;
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				Sl(2, n, t), G || Sl(4, n, t), Su(e, t, n);
				break;
			case 1:
				G || (El(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function" && wl(n, t, r)), Su(e, t, n);
				break;
			case 21:
				Su(e, t, n);
				break;
			case 22:
				G = (r = G) || n.memoizedState !== null, Su(e, t, n), G = r;
				break;
			case 30:
				El(n, t), Su(e, t, n);
				break;
			case 7:
				G || El(n, t), Su(e, t, n);
				break;
			default: Su(e, t, n);
		}
	}
	function wu(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null))) {
			e = e.dehydrated;
			try {
				Hh(e);
			} catch (e) {
				Z(t, t.return, e);
			}
		}
	}
	function Tu(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null)))) try {
			Hh(e);
		} catch (e) {
			Z(t, t.return, e);
		}
	}
	function Eu(e) {
		switch (e.tag) {
			case 31:
			case 13:
			case 19:
				var t = e.stateNode;
				return t === null && (t = e.stateNode = new su()), t;
			case 22: return e = e.stateNode, t = e._retryCache, t === null && (t = e._retryCache = new su()), t;
			default: throw Error(s(435, e.tag));
		}
	}
	function Du(e, t) {
		var n = Eu(e);
		t.forEach(function(t) {
			if (!n.has(t)) {
				n.add(t);
				var r = vf.bind(null, e, t);
				t.then(r, r);
			}
		});
	}
	function Ou(e, t, n) {
		var r = t.deletions;
		if (r !== null) for (var i = 0; i < r.length; i++) {
			var a = r[i], o = e, c = t, l = c;
			a: for (; l !== null;) {
				switch (l.tag) {
					case 27:
						if (Sp(l.type)) {
							bu = l.stateNode, xu = !1;
							break a;
						}
						break;
					case 5:
						bu = l.stateNode, xu = !1;
						break a;
					case 3:
					case 4:
						bu = l.stateNode.containerInfo, xu = !0;
						break a;
				}
				l = l.return;
			}
			if (bu === null) throw Error(s(160));
			Cu(o, c, a), bu = null, xu = !1, o = a.alternate, o !== null && (o.return = null), a.return = null;
		}
		if (t.subtreeFlags & 13886) for (t = t.child; t !== null;) Au(t, e, n), t = t.sibling;
	}
	var ku = null;
	function Au(e, t, n) {
		var r = e.alternate, i = e.flags;
		switch (e.tag) {
			case 0:
			case 11:
			case 14:
			case 15:
				if (i & 4 && (r = e.updateQueue, r = r === null ? null : r.events, r !== null)) for (var a = 0; a < r.length; a++) {
					var o = r[a];
					o.ref.impl = o.nextImpl;
				}
				Ou(t, e, n), ju(e), i & 4 && (Sl(3, e, e.return), xl(3, e), Sl(5, e, e.return));
				break;
			case 1:
				Ou(t, e, n), ju(e), i & 512 && (G || r === null || El(r, r.return)), i & 64 && iu && (e = e.updateQueue, e !== null && (t = e.callbacks, t !== null && (n = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = n === null ? t : n.concat(t))));
				break;
			case 26:
				if (a = ku, Ou(t, e, n), ju(e), i & 512 && (G || r === null || El(r, r.return)), i & 4) {
					if (i = r === null ? null : r.memoizedState, n = e.memoizedState, r === null) {
						if (n === null) {
							if (e.stateNode === null) {
								if (iu) e.stateNode = fp(e.type, e.memoizedProps, t.containerInfo, e);
								else {
									a: {
										t = e.type, n = e.memoizedProps, i = a.ownerDocument || a;
										b: switch (t) {
											case "title":
												r = i.getElementsByTagName("title")[0], (!r || r[Mt] || r[F] || r.namespaceURI === "http://www.w3.org/2000/svg" || r.hasAttribute("itemprop")) && (r = i.createElement(t), i.head.insertBefore(r, i.querySelector("head > title"))), np(r, t, n), r[F] = e, zt(r), t = r;
												break a;
											case "link":
												if (a = Gm("link", "href", i).get(t + (n.href || ""))) {
													for (o = 0; o < a.length; o++) if (r = a[o], r.getAttribute("href") === (n.href == null || n.href === "" ? null : n.href) && r.getAttribute("rel") === (n.rel == null ? null : n.rel) && r.getAttribute("title") === (n.title == null ? null : n.title) && r.getAttribute("crossorigin") === (n.crossOrigin == null ? null : n.crossOrigin)) {
														a.splice(o, 1);
														break b;
													}
												}
												r = i.createElement(t), np(r, t, n), i.head.appendChild(r);
												break;
											case "meta":
												if (a = Gm("meta", "content", i).get(t + (n.content || ""))) {
													for (o = 0; o < a.length; o++) if (r = a[o], r.getAttribute("content") === (n.content == null ? null : "" + n.content) && r.getAttribute("name") === (n.name == null ? null : n.name) && r.getAttribute("property") === (n.property == null ? null : n.property) && r.getAttribute("http-equiv") === (n.httpEquiv == null ? null : n.httpEquiv) && r.getAttribute("charset") === (n.charSet == null ? null : n.charSet)) {
														a.splice(o, 1);
														break b;
													}
												}
												r = i.createElement(t), np(r, t, n), i.head.appendChild(r);
												break;
											default: throw Error(s(468, t));
										}
										r[F] = e, zt(r), t = r;
									}
									e.stateNode = t;
								}
							} else iu || Km(a, e.type, e.stateNode);
						} else e.stateNode = Bm(a, n, e.memoizedProps);
					} else i === n ? n === null && e.stateNode !== null && Nl(e, e.memoizedProps, r.memoizedProps) : (i === null ? (t = r.stateNode, t === null || G || t.parentNode.removeChild(t)) : i.count--, n === null ? iu || Km(a, e.type, e.stateNode) : Bm(a, n, e.memoizedProps));
				}
				break;
			case 27:
				Ou(t, e, n), ju(e), i & 512 && (G || r === null || El(r, r.return)), r !== null && i & 4 && Nl(e, e.memoizedProps, r.memoizedProps);
				break;
			case 5:
				if (a = au, au = !1, Ou(t, e, n), au = a, ju(e), i & 512 && (G || r === null || El(r, r.return)), e.flags & 32) {
					t = e.stateNode;
					try {
						dn(t, ""), I = !0;
					} catch (t) {
						Z(e, e.return, t);
					}
				}
				i & 4 && e.stateNode != null && (t = e.memoizedProps, Nl(e, t, r === null ? t : r.memoizedProps)), i & 1024 && (ou = !0);
				break;
			case 6:
				if (Ou(t, e, n), ju(e), i & 4) {
					if (e.stateNode === null) throw Error(s(162));
					t = e.memoizedProps, n = e.stateNode;
					try {
						n.nodeValue = t, I = !0;
					} catch (t) {
						Z(e, e.return, t);
					}
				}
				break;
			case 3:
				if (I = !1, Wm = null, a = ku, ku = bm(t.containerInfo), Ou(t, e, n), ku = a, ju(e), i & 4 && r !== null && r.memoizedState.isDehydrated) try {
					Hh(t.containerInfo);
				} catch (t) {
					Z(e, e.return, t);
				}
				ou && (ou = !1, Mu(e)), I = !1;
				break;
			case 4:
				i = au, au = iu, r = Yt(), a = ku, ku = bm(e.stateNode.containerInfo), Ou(t, e, n), ju(e), ku = a, I && uu && (du = !0), I = r, au = i;
				break;
			case 12:
				Ou(t, e, n), ju(e);
				break;
			case 31:
				Ou(t, e, n), ju(e), i & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, Du(e, t)));
				break;
			case 13:
				Ou(t, e, n), ju(e), e.child.flags & 8192 && e.memoizedState !== null != (r !== null && r.memoizedState !== null) && (md = We()), i & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, Du(e, t)));
				break;
			case 22:
				a = e.memoizedState !== null, o = r !== null && r.memoizedState !== null;
				var c = iu, l = G, u = au;
				iu = c || a, au = u || a, G = l || o, Ou(t, e, n), G = l, au = u, iu = c, ju(e), i & 8192 && (t = e.stateNode, t._visibility = a ? t._visibility & -2 : t._visibility | 1, !a || r === null || o || iu || G || (t = o || G, n = iu, r = G, iu = a || iu, G = t, Iu(e, 2), iu = n, G = r), !a && au || gu(e, a)), i & 4 && (t = e.updateQueue, t !== null && (n = t.retryQueue, n !== null && (t.retryQueue = null, Du(e, n))));
				break;
			case 19:
				Ou(t, e, n), ju(e), i & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, Du(e, t)));
				break;
			case 30:
				i & 512 && (G || r === null || El(r, r.return)), i = Yt(), a = uu, o = (n & 335544064) === n, c = e.memoizedProps, uu = o && yi(c.default, c.update) !== "none", Ou(t, e, n), ju(e), o && r !== null && I && (e.flags |= 4), uu = a, I = i;
				break;
			case 21: break;
			case 7: i & 512 && (G || r === null || El(r, r.return)), r && r.stateNode !== null && (r.stateNode._fragmentFiber = e);
			default: Ou(t, e, n), ju(e);
		}
	}
	function ju(e) {
		var t = e.flags;
		if (t & 2) {
			try {
				for (var n, r = e.return; r !== null;) {
					if (Pl(r)) {
						n = r;
						break;
					}
					r = r.return;
				}
				r = null;
				for (var i = e.return; i !== null;) {
					if (jl(i)) {
						var a = i.stateNode;
						r === null ? r = [a] : r.push(a);
					}
					if (Al(i)) break;
					i = i.return;
				}
				var o = r;
				if (n == null) throw Error(s(160));
				switch (n.tag) {
					case 27:
						var c = n.stateNode;
						Ll(e, Fl(e), c, o);
						break;
					case 5:
						var l = n.stateNode;
						n.flags & 32 && (dn(l, ""), n.flags &= -33), Ll(e, Fl(e), l, o);
						break;
					case 3:
					case 4:
						var u = n.stateNode.containerInfo;
						Il(e, Fl(e), u, o);
						break;
					default: throw Error(s(161));
				}
			} catch (t) {
				Z(e, e.return, t);
			}
			e.flags &= -3;
		}
		t & 4096 && (e.flags &= -4097);
	}
	function Mu(e) {
		if (e.subtreeFlags & 1024) for (e = e.child; e !== null;) {
			var t = e;
			Mu(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, gh = !0, t.reset(), gh = !1), e = e.sibling;
		}
	}
	function Nu(e, t) {
		if (t.subtreeFlags & 9270) for (t = t.child; t !== null;) Pu(t, e), t = t.sibling;
		else ru(t, !1);
	}
	function Pu(e, t) {
		var n = e.alternate;
		if (n === null) Yl(e, !1);
		else switch (e.tag) {
			case 3:
				if (fu = lu = !1, Ul(), Nu(t, e), !lu && !du) {
					if (e = Hl, e !== null) for (var r = 0; r < e.length; r += 3) {
						n = e[r];
						var i = e[r + 1];
						Ep(n, e[r + 2]), n = n.ownerDocument.documentElement, n !== null && n.animate({
							opacity: [0, 0],
							pointerEvents: ["none", "none"]
						}, {
							duration: 0,
							fill: "forwards",
							pseudoElement: "::view-transition-group(" + i + ")"
						});
					}
					e = t.containerInfo, e = e.nodeType === 9 ? e.documentElement : e.ownerDocument.documentElement, e !== null && e.style.viewTransitionName === "" && (e.style.viewTransitionName = "none", e.animate({
						opacity: [0, 0],
						pointerEvents: ["none", "none"]
					}, {
						duration: 0,
						fill: "forwards",
						pseudoElement: "::view-transition-group(root)"
					}), e.animate({
						width: [0, 0],
						height: [0, 0]
					}, {
						duration: 0,
						fill: "forwards",
						pseudoElement: "::view-transition"
					})), fu = !0;
				}
				Hl = null;
				break;
			case 5:
				Nu(t, e);
				break;
			case 4:
				r = lu, lu = !1, Nu(t, e), lu && (du = !0), lu = r;
				break;
			case 22:
				e.memoizedState === null && (n.memoizedState === null ? Nu(t, e) : Yl(e, !1));
				break;
			case 30:
				r = lu, i = Ul(), lu = !1, Nu(t, e), lu && (e.flags |= 4);
				var a = e.memoizedProps, o = e.stateNode;
				t = _i(a, o), o = _i(n.memoizedProps, o);
				var s = yi(a.default, a.update);
				s === "none" ? t = !1 : (a = n.memoizedState, n.memoizedState = null, n = e.child, Wl = 0, t = nu(e, n, t, o, s, a, !0), Wl !== (a === null ? 0 : a.length) && (e.flags |= 32)), e.flags & 4 && t ? (Nd(e, e.memoizedProps.onUpdate), Hl = i) : i !== null && (i.push.apply(i, Hl), Hl = i), lu = e.flags & 32 ? !0 : r;
				break;
			default: Nu(t, e);
		}
	}
	function Fu(e, t) {
		if (t.subtreeFlags & 8772) for (t = t.child; t !== null;) hu(e, t.alternate, t), t = t.sibling;
	}
	function Iu(e, t) {
		for (e = e.child; e !== null;) {
			var n = e, r = t;
			switch (n.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					Sl(4, n, n.return), Iu(n, r);
					break;
				case 1:
					El(n, n.return);
					var i = n.stateNode;
					typeof i.componentWillUnmount == "function" && wl(n, n.return, i), Iu(n, r);
					break;
				case 27: r & 2 && gm(n.stateNode, n.type, n.memoizedProps);
				case 5:
					El(n, n.return), n.tag !== 5 && n.tag !== 27 || kl(n), Iu(n, r);
					break;
				case 6:
					kl(n);
					break;
				case 26:
					El(n, n.return), i = n.stateNode, n.memoizedState !== null || i === null || G || i.parentNode.removeChild(i), Iu(n, r);
					break;
				case 22:
					n.memoizedState === null && Iu(n, r);
					break;
				case 30:
					El(n, n.return), Iu(n, r);
					break;
				case 7: El(n, n.return);
				default: Iu(n, r);
			}
			e = e.sibling;
		}
	}
	function Lu(e, t, n) {
		for (n = t.subtreeFlags & 8772 ? n : n & -2, t = t.child; t !== null;) {
			var r = t.alternate, i = e, a = t, o = a.flags, s = !!(n & 1);
			switch (a.tag) {
				case 0:
				case 11:
				case 15:
					Lu(i, a, n), xl(4, a);
					break;
				case 1:
					if (Lu(i, a, n), r = a, i = r.stateNode, typeof i.componentDidMount == "function") try {
						i.componentDidMount();
					} catch (e) {
						Z(r, r.return, e);
					}
					if (r = a, i = r.updateQueue, i !== null) {
						var c = r.stateNode;
						try {
							var l = i.shared.hiddenCallbacks;
							if (l !== null) for (i.shared.hiddenCallbacks = null, i = 0; i < l.length; i++) So(l[i], c);
						} catch (e) {
							Z(r, r.return, e);
						}
					}
					s && o & 64 && Cl(a), Tl(a, a.return);
					break;
				case 27: n & 2 && Rl(a);
				case 5:
					a.tag !== 5 && a.tag !== 27 || Ol(a), Lu(i, a, n), s && r === null && o & 4 && Ml(a), Tl(a, a.return);
					break;
				case 6:
					Ol(a);
					break;
				case 26:
					c = a.stateNode, a.memoizedState !== null || c === null || iu || Km(bm(c.ownerDocument), a.type, c), Lu(i, a, n), s && r === null && o & 4 && Ml(a), Tl(a, a.return);
					break;
				case 12:
					Lu(i, a, n);
					break;
				case 31:
					Lu(i, a, n), s && o & 4 && wu(i, a);
					break;
				case 13:
					Lu(i, a, n), s && o & 4 && Tu(i, a);
					break;
				case 22:
					a.memoizedState === null && Lu(i, a, n), Tl(a, a.return);
					break;
				case 30:
					Lu(i, a, n), Tl(a, a.return);
					break;
				case 7: Tl(a, a.return);
				default: Lu(i, a, n);
			}
			t = t.sibling;
		}
	}
	function Ru(e, t) {
		var n = null;
		e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== n && (e != null && e.refCount++, n != null && ja(n));
	}
	function zu(e, t) {
		e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && ja(e));
	}
	function Bu(e, t, n, r) {
		var i = (n & 335544064) === n;
		if (t.subtreeFlags & (i ? 10262 : 10256)) for (t = t.child; t !== null;) Vu(e, t, n, r), t = t.sibling;
		else i && tu(t);
	}
	function Vu(e, t, n, r) {
		var i = (n & 335544064) === n;
		i && t.alternate === null && t.return !== null && t.return.alternate !== null && eu(t);
		var a = t.flags;
		switch (t.tag) {
			case 0:
			case 11:
			case 15:
				Bu(e, t, n, r), a & 2048 && xl(9, t);
				break;
			case 1:
				Bu(e, t, n, r);
				break;
			case 3:
				Bu(e, t, n, r), i && fu && (e = e.containerInfo, e = e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, e.style.viewTransitionName === "root" && (e.style.viewTransitionName = ""), e = e.ownerDocument.documentElement, e !== null && e.style.viewTransitionName === "none" && (e.style.viewTransitionName = "")), a & 2048 && (a = null, t.alternate !== null && (a = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== a && (t.refCount++, a != null && ja(a)));
				break;
			case 12:
				if (a & 2048) {
					Bu(e, t, n, r), a = t.stateNode;
					try {
						var o = t.memoizedProps, s = o.id, c = o.onPostCommit;
						typeof c == "function" && c(s, t.alternate === null ? "mount" : "update", a.passiveEffectDuration, -0);
					} catch (e) {
						Z(t, t.return, e);
					}
				} else Bu(e, t, n, r);
				break;
			case 31:
				Bu(e, t, n, r);
				break;
			case 13:
				Bu(e, t, n, r);
				break;
			case 23: break;
			case 22:
				o = t.stateNode, s = t.alternate, t.memoizedState === null ? (i && s !== null && s.memoizedState !== null && eu(t), o._visibility & 2 ? Bu(e, t, n, r) : (o._visibility |= 2, Hu(e, t, n, r, !!(t.subtreeFlags & 10256) || !1))) : (i && s !== null && s.memoizedState === null && eu(s), o._visibility & 2 ? Bu(e, t, n, r) : Uu(e, t)), a & 2048 && Ru(s, t);
				break;
			case 24:
				Bu(e, t, n, r), a & 2048 && zu(t.alternate, t);
				break;
			case 30:
				i && (a = t.alternate, a !== null && (ql(a.child, !0), ql(t.child, !0))), Bu(e, t, n, r);
				break;
			default: Bu(e, t, n, r);
		}
	}
	function Hu(e, t, n, r, i) {
		for (i &&= !!(t.subtreeFlags & 10256) || !1, t = t.child; t !== null;) {
			var a = e, o = t, s = n, c = r, l = o.flags;
			switch (o.tag) {
				case 0:
				case 11:
				case 15:
					Hu(a, o, s, c, i), xl(8, o);
					break;
				case 23: break;
				case 22:
					var u = o.stateNode;
					o.memoizedState === null ? (u._visibility |= 2, Hu(a, o, s, c, i)) : u._visibility & 2 ? Hu(a, o, s, c, i) : Uu(a, o), i && l & 2048 && Ru(o.alternate, o);
					break;
				case 24:
					Hu(a, o, s, c, i), i && l & 2048 && zu(o.alternate, o);
					break;
				default: Hu(a, o, s, c, i);
			}
			t = t.sibling;
		}
	}
	function Uu(e, t) {
		if (t.subtreeFlags & 10256) for (t = t.child; t !== null;) {
			var n = e, r = t, i = r.flags;
			switch (r.tag) {
				case 22:
					Uu(n, r), i & 2048 && Ru(r.alternate, r);
					break;
				case 24:
					Uu(n, r), i & 2048 && zu(r.alternate, r);
					break;
				default: Uu(n, r);
			}
			t = t.sibling;
		}
	}
	var Wu = 8192;
	function Gu(e, t, n) {
		if (e.subtreeFlags & Wu) for (e = e.child; e !== null;) Ku(e, t, n), e = e.sibling;
	}
	function Ku(e, t, n) {
		switch (e.tag) {
			case 26:
				Gu(e, t, n), e.flags & Wu && (e.memoizedState === null ? (e = e.stateNode, (t & 335544128) === t && Zm(n, e)) : Qm(n, ku, e.memoizedState, e.memoizedProps));
				break;
			case 5:
				Gu(e, t, n), e.flags & Wu && (e = e.stateNode, (t & 335544128) === t && Zm(n, e));
				break;
			case 3:
			case 4:
				var r = ku;
				ku = bm(e.stateNode.containerInfo), Gu(e, t, n), ku = r;
				break;
			case 22:
				e.memoizedState === null && (r = e.alternate, r !== null && r.memoizedState !== null ? (r = Wu, Wu = 16777216, Gu(e, t, n), Wu = r) : Gu(e, t, n));
				break;
			case 30:
				if ((e.flags & Wu) !== 0 && (r = e.memoizedProps.name, r != null && r !== "auto")) {
					var i = e.stateNode;
					i.paired = null, Bl === null && (Bl = /* @__PURE__ */ new Map()), Bl.set(r, i);
				}
				Gu(e, t, n);
				break;
			default: Gu(e, t, n);
		}
	}
	function qu(e) {
		var t = e.alternate;
		if (t !== null && (e = t.child, e !== null)) {
			t.child = null;
			do
				t = e.sibling, e.sibling = null, e = t;
			while (e !== null);
		}
	}
	function Ju(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				cu = r, Zu(r, e);
			}
			qu(e);
		}
		if (e.subtreeFlags & 10256) for (e = e.child; e !== null;) Yu(e), e = e.sibling;
	}
	function Yu(e) {
		switch (e.tag) {
			case 0:
			case 11:
			case 15:
				Ju(e), e.flags & 2048 && Sl(9, e, e.return);
				break;
			case 3:
				Ju(e);
				break;
			case 12:
				Ju(e);
				break;
			case 22:
				var t = e.stateNode;
				e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, Xu(e)) : Ju(e);
				break;
			default: Ju(e);
		}
	}
	function Xu(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				cu = r, Zu(r, e);
			}
			qu(e);
		}
		for (e = e.child; e !== null;) {
			switch (t = e, t.tag) {
				case 0:
				case 11:
				case 15:
					Sl(8, t, t.return), Xu(t);
					break;
				case 22:
					n = t.stateNode, n._visibility & 2 && (n._visibility &= -3, Xu(t));
					break;
				default: Xu(t);
			}
			e = e.sibling;
		}
	}
	function Zu(e, t) {
		for (; cu !== null;) {
			var n = cu;
			switch (n.tag) {
				case 0:
				case 11:
				case 15:
					Sl(8, n, t);
					break;
				case 23:
				case 22:
					if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
						var r = n.memoizedState.cachePool.pool;
						r != null && r.refCount++;
					}
					break;
				case 24: ja(n.memoizedState.cache);
			}
			if (r = n.child, r !== null) r.return = n, cu = r;
			else a: for (n = e; cu !== null;) {
				r = cu;
				var i = r.sibling, a = r.return;
				if (yu(r), r === n) {
					cu = null;
					break a;
				}
				if (i !== null) {
					i.return = a, cu = i;
					break a;
				}
				cu = a;
			}
		}
	}
	var Qu = {
		getCacheForType: function(e) {
			var t = wa(ka), n = t.data.get(e);
			return n === void 0 && (n = e(), t.data.set(e, n)), n;
		},
		cacheSignal: function() {
			return wa(ka).controller.signal;
		}
	}, $u = typeof WeakMap == "function" ? WeakMap : Map, K = 0, q = null, J = null, Y = 0, X = 0, ed = null, td = !1, nd = !1, rd = !1, id = 0, ad = 0, od = 0, sd = 0, cd = 0, ld = 0, ud = 0, dd = null, fd = null, pd = !1, md = 0, hd = 0, gd = Infinity, _d = null, vd = null, yd = 0, bd = null, xd = null, Sd = 0, Cd = 0, wd = null, Td = null, Ed = null, Dd = null, Od = null, kd = 0, Ad = null;
	function jd() {
		return K & 2 && Y !== 0 ? Y & -Y : M.T === null ? Ct() : Pf();
	}
	function Md() {
		if (ld === 0) {
			if (!(Y & 536870912) || V) {
				var e = st;
				st <<= 1, !(st & 3932160) && (st = 262144), ld = e;
			} else ld = 536870912;
		}
		return e = ko.current, e !== null && (e.flags |= 32), ld;
	}
	function Nd(e, t) {
		if (t != null) {
			var n = e.stateNode, r = n.ref;
			r === null && (r = n.ref = Pp(_i(e.memoizedProps, n))), Dd === null && (Dd = []), Dd.push(t.bind(null, r));
		}
	}
	function Pd(e, t, n) {
		(e === q && (X === 2 || X === 9) || e.cancelPendingCommit !== null) && (Vd(e, 0), Rd(e, Y, ld, !1)), gt(e, n), K & 2 && e === q || (e === q && (!(K & 2) && (sd |= n), ad === 4 && Rd(e, Y, ld, !1)), Ef(e));
	}
	function Fd(e, t, n) {
		if (K & 6) throw Error(s(327));
		var r = !n && !(t & 127) && (t & e.expiredLanes) === 0 || dt(e, t), i = r ? Yd(e, t) : qd(e, t, !0), a = r;
		do {
			if (i === 0) {
				nd && !r && Rd(e, t, 0, !1);
				break;
			}
			if (n = e.current.alternate, a && !Ld(n)) i = qd(e, t, !1), a = !1;
			else {
				if (i === 2) {
					if (a = t, e.errorRecoveryDisabledLanes & a) var o = 0;
					else o = e.pendingLanes & -536870913, o = o === 0 ? o & 536870912 ? 536870912 : 0 : o;
					if (o !== 0) {
						t = o;
						a: {
							var c = e;
							i = dd;
							var l = c.current.memoizedState.isDehydrated;
							if (l && (Vd(c, o).flags |= 256), o = qd(c, o, !1), o !== 2 && o !== 6) {
								if (rd && !l) {
									c.errorRecoveryDisabledLanes |= a, sd |= a, i = 4;
									break a;
								}
								a = fd, fd = i, a !== null && (fd === null ? fd = a : fd.push.apply(fd, a));
							}
							i = o;
						}
						if (a = !1, i !== 2) continue;
					}
				}
				if (i === 1) {
					Vd(e, 0), Rd(e, t, 0, !0);
					break;
				}
				a: {
					switch (r = e, a = i, a) {
						case 0:
						case 1: throw Error(s(345));
						case 4: if ((t & 4194048) !== t && (t & 62914560) !== t) break;
						case 6:
							Rd(r, t, ld, !td);
							break a;
						case 2:
							fd = null;
							break;
						case 3:
						case 5: break;
						default: throw Error(s(329));
					}
					if ((t & 62914560) === t && (i = md + 300 - We(), 10 < i)) {
						if (Rd(r, t, ld, !td), ut(r, 0, !0) !== 0) break a;
						Sd = t, r.timeoutHandle = gp(Id.bind(null, r, n, fd, _d, pd, t, ld, sd, ud, td, a, "Throttled", -0, 0), i);
						break a;
					}
					Id(r, n, fd, _d, pd, t, ld, sd, ud, td, a, null, -0, 0);
				}
				break;
			}
		} while (1);
		Ef(e);
	}
	function Id(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
		e.timeoutHandle = -1;
		var m = t.subtreeFlags, h = (a & 335544064) === a;
		d = null, (h || m & 8192 || (m & 16785408) == 16785408) && (d = {
			stylesheets: null,
			count: 0,
			imgCount: 0,
			imgBytes: 0,
			suspenseyImages: [],
			waitingForImages: !0,
			waitingForViewTransition: !1,
			unsuspend: yn
		}, Bl = null, Ku(t, a, d), h && (m = d, h = e.containerInfo, h = (h.nodeType === 9 ? h : h.ownerDocument).__reactViewTransition, h != null && (m.count++, m.waitingForViewTransition = !0, m = nh.bind(m), h.finished.then(m, m))), m = (a & 62914560) === a ? md - We() : (a & 4194048) === a ? hd - We() : 0, m = eh(d, m), m !== null) ? (Sd = a, e.cancelPendingCommit = m(nf.bind(null, e, t, a, n, r, i, o, s, c, l, u, d, null, f, p)), Rd(e, a, o, !l)) : nf(e, t, a, n, r, i, o, s, c, l, u, d);
	}
	function Ld(e) {
		for (var t = e;;) {
			var n = t.tag;
			if ((n === 0 || n === 11 || n === 15) && t.flags & 16384 && (n = t.updateQueue, n !== null && (n = n.stores, n !== null))) for (var r = 0; r < n.length; r++) {
				var i = n[r], a = i.getSnapshot;
				i = i.value;
				try {
					if (!z(a(), i)) return !1;
				} catch {
					return !1;
				}
			}
			if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
			else {
				if (t === e) break;
				for (; t.sibling === null;) {
					if (t.return === null || t.return === e) return !0;
					t = t.return;
				}
				t.sibling.return = t.return, t = t.sibling;
			}
		}
		return !0;
	}
	function Rd(e, t, n, r) {
		t = ft(e, t), t &= ~cd, t &= ~sd, e.suspendedLanes |= t, e.pingedLanes &= ~t, r && (e.warmLanes |= t), r = e.expirationTimes;
		for (var i = t; 0 < i;) {
			var a = 31 - nt(i), o = 1 << a;
			r[a] = -1, i &= ~o;
		}
		n !== 0 && vt(e, n, t);
	}
	function zd() {
		return K & 6 ? !0 : (Df(0, !1), !1);
	}
	function Bd() {
		if (J !== null) {
			if (X === 0) var e = J.return;
			else e = J, ga = ha = null, rs(e), ro = null, io = 0, e = J;
			for (; e !== null;) bl(e.alternate, e), e = e.return;
			J = null;
		}
	}
	function Vd(e, t) {
		var n = e.timeoutHandle;
		return n !== -1 && (e.timeoutHandle = -1, _p(n)), n = e.cancelPendingCommit, n !== null && (e.cancelPendingCommit = null, n()), Sd = 0, Bd(), q = e, J = n = Pi(e.current, null), Y = t, X = 0, ed = null, td = !1, nd = dt(e, t), rd = !1, ud = ld = cd = sd = od = ad = 0, fd = dd = null, pd = !1, id = ft(e, t), wi(), n;
	}
	function Hd(e, t) {
		U = null, M.H = pc, t === qa || t === Ya ? (t = to(), X = 3) : t === Ja ? (t = to(), X = 4) : X = t === jc ? 8 : typeof t == "object" && t && typeof t.then == "function" ? 6 : 1, ed = t, J === null && (ad = 1, Tc(e, Hi(t, e.current)));
	}
	function Ud() {
		var e = ko.current;
		return e === null ? !0 : (Y & 4194048) === Y ? Ao === null : (Y & 62914560) === Y || Y & 536870912 ? e === Ao : !1;
	}
	function Wd() {
		var e = M.H;
		return M.H = pc, e === null ? pc : e;
	}
	function Gd() {
		var e = M.A;
		return M.A = Qu, e;
	}
	function Kd() {
		ad = 4, td || (Y & 4194048) !== Y && ko.current !== null || (nd = !0), !(od & 134217727) && !(sd & 134217727) || q === null || Rd(q, Y, ld, !1);
	}
	function qd(e, t, n) {
		var r = K;
		K |= 2;
		var i = Wd(), a = Gd();
		(q !== e || Y !== t) && (_d = null, Vd(e, t)), t = !1;
		var o = ad;
		a: do
			try {
				if (X !== 0 && J !== null) {
					var s = J, c = ed;
					switch (X) {
						case 8:
							Bd(), o = 6;
							break a;
						case 3:
						case 2:
						case 9:
						case 6:
							ko.current === null && (t = !0);
							var l = X;
							if (X = 0, ed = null, $d(e, s, c, l), n && nd) {
								o = 0;
								break a;
							}
							break;
						default: l = X, X = 0, ed = null, $d(e, s, c, l);
					}
				}
				Jd(), o = ad;
				break;
			} catch (t) {
				Hd(e, t);
			}
		while (1);
		return t && e.shellSuspendCounter++, ga = ha = null, K = r, M.H = i, M.A = a, J === null && (q = null, Y = 0, wi()), o;
	}
	function Jd() {
		for (; J !== null;) Zd(J);
	}
	function Yd(e, t) {
		var n = K;
		K |= 2;
		var r = Wd(), i = Gd();
		q !== e || Y !== t ? (_d = null, gd = We() + 500, Vd(e, t)) : nd = dt(e, t);
		a: do
			try {
				if (X !== 0 && J !== null) {
					t = J;
					var a = ed;
					b: switch (X) {
						case 1:
							X = 0, ed = null, $d(e, t, a, 1);
							break;
						case 2:
						case 9:
							if (Za(a)) {
								X = 0, ed = null, Qd(t);
								break;
							}
							t = function() {
								X !== 2 && X !== 9 || q !== e || (X = 7), Ef(e);
							}, a.then(t, t);
							break a;
						case 3:
							X = 7;
							break a;
						case 4:
							X = 5;
							break a;
						case 7:
							Za(a) ? (X = 0, ed = null, Qd(t)) : (X = 0, ed = null, $d(e, t, a, 7));
							break;
						case 5:
							var o = null;
							switch (J.tag) {
								case 26: o = J.memoizedState;
								case 5:
								case 27:
									var c = J;
									if (o ? Ym(o) : c.stateNode.complete) {
										X = 0, ed = null;
										var l = c.sibling;
										if (l !== null) J = l;
										else {
											var u = c.return;
											u === null ? J = null : (J = u, ef(u));
										}
										break b;
									}
							}
							X = 0, ed = null, $d(e, t, a, 5);
							break;
						case 6:
							X = 0, ed = null, $d(e, t, a, 6);
							break;
						case 8:
							Bd(), ad = 6;
							break a;
						default: throw Error(s(462));
					}
				}
				Xd();
				break;
			} catch (t) {
				Hd(e, t);
			}
		while (1);
		return ga = ha = null, M.H = r, M.A = i, K = n, J === null ? (q = null, Y = 0, wi(), ad) : 0;
	}
	function Xd() {
		for (; J !== null && !He();) Zd(J);
	}
	function Zd(e) {
		var t = dl(e.alternate, e, id);
		e.memoizedProps = e.pendingProps, t === null ? ef(e) : J = t;
	}
	function Qd(e) {
		var t = e, n = t.alternate;
		switch (t.tag) {
			case 15:
			case 0:
				t = Gc(n, t, t.pendingProps, t.type, void 0, Y);
				break;
			case 11:
				t = Gc(n, t, t.pendingProps, t.type.render, t.ref, Y);
				break;
			case 5:
				rs(t);
				var r = t;
				r === ra && (V ? (la(r), r.tag === 5 && r.stateNode != null && (B = r.stateNode)) : (la(r), V = !0));
			default: bl(n, t), t = J = Fi(t, id), t = dl(n, t, id);
		}
		e.memoizedProps = e.pendingProps, t === null ? ef(e) : J = t;
	}
	function $d(e, t, n, r) {
		ga = ha = null, rs(t), ro = null, io = 0;
		var i = t.return;
		try {
			if (Ac(e, i, t, n, Y)) {
				ad = 1, Tc(e, Hi(n, e.current)), J = null;
				return;
			}
		} catch (t) {
			if (i !== null) throw J = i, t;
			ad = 1, Tc(e, Hi(n, e.current)), J = null;
			return;
		}
		t.flags & 32768 ? (V || r === 1 ? e = !0 : nd || Y & 536870912 ? e = !1 : (td = e = !0, (r === 2 || r === 9 || r === 3 || r === 6) && (r = ko.current, r !== null && r.tag === 13 && (r.flags |= 16384))), tf(t, e)) : ef(t);
	}
	function ef(e) {
		var t = e;
		do {
			if (t.flags & 32768) {
				tf(t, td);
				return;
			}
			e = t.return;
			var n = vl(t.alternate, t, id);
			if (n !== null) {
				J = n;
				return;
			}
			if (t = t.sibling, t !== null) {
				J = t;
				return;
			}
			J = t = e;
		} while (t !== null);
		ad === 0 && (ad = 5);
	}
	function tf(e, t) {
		do {
			var n = yl(e.alternate, e);
			if (n !== null) {
				n.flags &= 32767, J = n;
				return;
			}
			if (n = e.return, n !== null && (n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null), !t && (e = e.sibling, e !== null)) {
				J = e;
				return;
			}
			J = e = n;
		} while (e !== null);
		ad = 6, J = null;
	}
	function nf(e, t, n, r, i, a, o, c, l, u, d, f) {
		e.cancelPendingCommit = null;
		do
			df();
		while (yd !== 0);
		if (K & 6) throw Error(s(327));
		if (t !== null) {
			if (t === e.current) throw Error(s(177));
			e === q && (J = q = null, Y = 0), xd = t, bd = e, Sd = n, wd = i, Td = r, rf(e, t, n, o, c, l, f);
		}
	}
	function rf(e, t, n, r, i, a, o) {
		var s = t.lanes | t.childLanes;
		if (Cd = s, s |= Ci, _t(e, n, s, r, i, a), Dd = null, (n & 335544064) === n ? (Od = Pa(e), r = 10262) : (Od = null, r = 10256), (t.subtreeFlags & r) !== 0 || (t.flags & r) !== 0 ? (e.callbackNode = null, e.callbackPriority = 0, yf(Je, function() {
			return ff(), null;
		})) : (e.callbackNode = null, e.callbackPriority = 0), zl = !1, r = !!(t.flags & 13878), t.subtreeFlags & 13878 || r) {
			r = M.T, M.T = null, i = N.p, N.p = 2, a = K, K |= 4;
			try {
				pu(e, t, n);
			} finally {
				K = a, N.p = i, M.T = r;
			}
		}
		yd = 1, zl ? Ed = Mp(o, e.containerInfo, Od, sf, cf, of, lf, ff, af, null, null) : (sf(), cf(), lf());
	}
	function af(e) {
		if (yd !== 0) {
			var t = bd.onRecoverableError;
			t(e, { componentStack: null });
		}
	}
	function of() {
		yd === 3 && (yd = 0, Pu(xd, bd), yd = 4);
	}
	function sf() {
		if (yd === 1) {
			yd = 0;
			var e = bd, t = xd, n = Sd, r = !!(t.flags & 13878);
			if (t.subtreeFlags & 13878 || r) {
				r = M.T, M.T = null;
				var i = N.p;
				N.p = 2;
				var a = K;
				K |= 4;
				try {
					uu = du = !1, Au(t, e, n), n = cp;
					var o = qr(e.containerInfo), s = n.focusedElem, c = n.selectionRange;
					if (o !== s && s && s.ownerDocument && Kr(s.ownerDocument.documentElement, s)) {
						if (c !== null && Jr(s)) {
							var l = c.start, u = c.end;
							if (u === void 0 && (u = l), "selectionStart" in s) s.selectionStart = l, s.selectionEnd = Math.min(u, s.value.length);
							else {
								var d = s.ownerDocument || document, f = d && d.defaultView || window;
								if (f.getSelection) {
									var p = f.getSelection(), m = s.textContent.length, h = Math.min(c.start, m), g = c.end === void 0 ? h : Math.min(c.end, m);
									!p.extend && h > g && (o = g, g = h, h = o);
									var _ = Gr(s, h), v = Gr(s, g);
									if (_ && v && (p.rangeCount !== 1 || p.anchorNode !== _.node || p.anchorOffset !== _.offset || p.focusNode !== v.node || p.focusOffset !== v.offset)) {
										var y = d.createRange();
										y.setStart(_.node, _.offset), p.removeAllRanges(), h > g ? (p.addRange(y), p.extend(v.node, v.offset)) : (y.setEnd(v.node, v.offset), p.addRange(y));
									}
								}
							}
						}
						for (d = [], p = s; p = p.parentNode;) p.nodeType === 1 && d.push({
							element: p,
							left: p.scrollLeft,
							top: p.scrollTop
						});
						for (typeof s.focus == "function" && s.focus(), s = 0; s < d.length; s++) {
							var b = d[s];
							b.element.scrollLeft = b.left, b.element.scrollTop = b.top;
						}
					}
					gh = !!sp, cp = sp = null;
				} finally {
					K = a, N.p = i, M.T = r;
				}
			}
			e.current = t, yd = 2;
		}
	}
	function cf() {
		if (yd === 2) {
			yd = 0;
			var e = bd, t = xd, n = !!(t.flags & 8772);
			if (t.subtreeFlags & 8772 || n) {
				n = M.T, M.T = null;
				var r = N.p;
				N.p = 2;
				var i = K;
				K |= 4;
				try {
					hu(e, t.alternate, t);
				} finally {
					K = i, N.p = r, M.T = n;
				}
			}
			yd = 3;
		}
	}
	function lf() {
		if (yd === 4 || yd === 3) {
			yd = 0;
			var e = Ed;
			Ed = null, Ue();
			var t = bd, n = xd, r = Sd, i = Td, a = (r & 335544064) === r ? 10262 : 10256;
			if ((n.subtreeFlags & a) !== 0 || (n.flags & a) !== 0 ? yd = 5 : (yd = 0, xd = bd = null, uf(t, t.pendingLanes)), a = t.pendingLanes, a === 0 && (vd = null), St(r), n = n.stateNode, et && typeof et.onCommitFiberRoot == "function") try {
				et.onCommitFiberRoot($e, n, void 0, (n.current.flags & 128) == 128);
			} catch {}
			if (i !== null) {
				n = M.T, a = N.p, N.p = 2, M.T = null;
				try {
					for (var o = t.onRecoverableError, s = 0; s < i.length; s++) {
						var c = i[s];
						o(c.value, { componentStack: c.stack });
					}
				} finally {
					M.T = n, N.p = a;
				}
			}
			if (i = Dd, o = Od, Od = null, i !== null && (Dd = null, o === null && (o = []), e !== null)) for (c = 0; c < i.length; c++) n = (0, i[c])(o), n !== void 0 && e.finished.finally(n);
			Sd & 3 && df(), Ef(t), a = t.pendingLanes, r & 261930 && a & 42 ? t === Ad ? kd++ : (kd = 0, Ad = t) : (kd = 0, Ad = null), Df(0, !1);
		}
	}
	function uf(e, t) {
		(e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, ja(t)));
	}
	function df() {
		return Ed !== null && (Ed.skipTransition(), Ed = null), sf(), cf(), lf(), ff();
	}
	function ff() {
		if (yd !== 5) return !1;
		var e = bd, t = Cd;
		Cd = 0;
		var n = St(Sd), r = M.T, i = N.p;
		try {
			N.p = 32 > n ? 32 : n, M.T = null, n = wd, wd = null;
			var a = bd, o = Sd;
			if (yd = 0, xd = bd = null, Sd = 0, K & 6) throw Error(s(331));
			var c = K;
			if (K |= 4, Yu(a.current), Vu(a, a.current, o, n), K = c, Df(0, !1), et && typeof et.onPostCommitFiberRoot == "function") try {
				et.onPostCommitFiberRoot($e, a);
			} catch {}
			return !0;
		} finally {
			N.p = i, M.T = r, uf(e, t);
		}
	}
	function pf(e, t, n) {
		t = Hi(n, t), t = Dc(e.stateNode, t, 2), e = go(e, t, 2), e !== null && (gt(e, 2), Ef(e));
	}
	function Z(e, t, n) {
		if (e.tag === 3) pf(e, e, n);
		else for (; t !== null;) {
			if (t.tag === 3) {
				pf(t, e, n);
				break;
			}
			if (t.tag === 1) {
				var r = t.stateNode;
				if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (vd === null || !vd.has(r))) {
					e = Hi(n, e), n = Oc(2), r = go(t, n, 2), r !== null && (kc(n, r, t, e), gt(r, 2), Ef(r));
					break;
				}
			}
			t = t.return;
		}
	}
	function mf(e, t, n) {
		var r = e.pingCache;
		if (r === null) {
			r = e.pingCache = new $u();
			var i = /* @__PURE__ */ new Set();
			r.set(t, i);
		} else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
		i.has(n) || (rd = !0, i.add(n), e = hf.bind(null, e, t, n), t.then(e, e));
	}
	function hf(e, t, n) {
		var r = e.pingCache;
		r !== null && r.delete(t), e.pingedLanes |= e.suspendedLanes & n, e.warmLanes &= ~n, q === e && (Y & n) === n && (ad === 4 || ad === 3 && (Y & 62914560) === Y && 300 > We() - md ? K & 2 ? cd |= n : Vd(e, 0) : cd |= n, ud === Y && (ud = 0)), Ef(e);
	}
	function gf(e, t) {
		t === 0 && (t = mt()), e = Di(e, t), e !== null && (gt(e, t), Ef(e));
	}
	function _f(e) {
		var t = e.memoizedState, n = 0;
		t !== null && (n = t.retryLane), gf(e, n);
	}
	function vf(e, t) {
		var n = 0;
		switch (e.tag) {
			case 31:
			case 13:
				var r = e.stateNode, i = e.memoizedState;
				i !== null && (n = i.retryLane);
				break;
			case 19:
				r = e.stateNode;
				break;
			case 22:
				r = e.stateNode._retryCache;
				break;
			default: throw Error(s(314));
		}
		r !== null && r.delete(t), gf(e, n);
	}
	function yf(e, t) {
		return Be(e, t);
	}
	var bf = null, xf = null, Sf = !1, Cf = !1, wf = !1, Tf = 0;
	function Ef(e) {
		e !== xf && e.next === null && (xf === null ? bf = xf = e : xf = xf.next = e), Cf = !0, Sf || (Sf = !0, Nf());
	}
	function Df(e, t) {
		if (!wf && Cf) {
			wf = !0;
			do
				for (var n = !1, r = bf; r !== null;) {
					if (!t) {
						if (e !== 0) {
							var i = r.pendingLanes;
							if (i === 0) var a = 0;
							else {
								var o = r.suspendedLanes, s = r.pingedLanes;
								a = (1 << 31 - nt(42 | e) + 1) - 1, a &= i & ~(o & ~s), a = a & 201326741 ? a & 201326741 | 1 : a ? a | 2 : 0;
							}
							a !== 0 && (n = !0, Mf(r, a));
						} else a = Y, a = ut(r, r === q ? a : 0, r.cancelPendingCommit !== null || r.timeoutHandle !== -1), !(a & 3) || dt(r, a) || (n = !0, Mf(r, a));
					}
					r = r.next;
				}
			while (n);
			wf = !1;
		}
	}
	function Of() {
		kf();
	}
	function kf() {
		Cf = Sf = !1;
		var e = 0;
		Tf !== 0 && hp() && (e = Tf);
		for (var t = We(), n = null, r = bf; r !== null;) {
			var i = r.next, a = Af(r, t);
			a === 0 ? (r.next = null, n === null ? bf = i : n.next = i, i === null && (xf = n)) : (n = r, (e !== 0 || a & 3) && (Cf = !0)), r = i;
		}
		yd !== 0 && yd !== 5 || Df(e, !1), Tf !== 0 && (Tf = 0);
	}
	function Af(e, t) {
		for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes & -62914561; 0 < a;) {
			var o = 31 - nt(a), s = 1 << o, c = i[o];
			c === -1 ? ((s & n) === 0 || (s & r) !== 0) && (i[o] = pt(s, t)) : c <= t && (e.expiredLanes |= s), a &= ~s;
		}
		if (t = q, n = Y, n = ut(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r = e.callbackNode, n === 0 || e === t && (X === 2 || X === 9) || e.cancelPendingCommit !== null) return r !== null && r !== null && Ve(r), e.callbackNode = null, e.callbackPriority = 0;
		if (!(n & 3) || dt(e, n)) {
			if (t = n & -n, t === e.callbackPriority) return t;
			switch (r !== null && Ve(r), St(n)) {
				case 2:
				case 8:
					n = qe;
					break;
				case 32:
					n = Je;
					break;
				case 268435456:
					n = Xe;
					break;
				default: n = Je;
			}
			return r = jf.bind(null, e), n = Be(n, r), e.callbackPriority = t, e.callbackNode = n, t;
		}
		return r !== null && r !== null && Ve(r), e.callbackPriority = 2, e.callbackNode = null, 2;
	}
	function jf(e, t) {
		if (yd !== 0 && yd !== 5) return e.callbackNode = null, e.callbackPriority = 0, null;
		var n = e.callbackNode;
		if (df() && e.callbackNode !== n) return null;
		var r = Y;
		return r = ut(e, e === q ? r : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r === 0 ? null : (Fd(e, r, t), Af(e, We()), e.callbackNode != null && e.callbackNode === n ? jf.bind(null, e) : null);
	}
	function Mf(e, t) {
		if (df()) return null;
		Fd(e, t, !0);
	}
	function Nf() {
		bp(function() {
			K & 6 ? Be(Ke, Of) : kf();
		});
	}
	function Pf() {
		if (Tf === 0) {
			var e = La;
			e === 0 && (e = ot, ot <<= 1, !(ot & 261888) && (ot = 256)), Tf = e;
		}
		return Tf;
	}
	function Ff(e) {
		return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : vn(e);
	}
	function If(e, t, n, r, i) {
		if (t === "submit" && n && n.stateNode === i) {
			var a = Ff((i[Et] || null).action), o = r.submitter;
			o && (t = (t = o[Et] || null) ? Ff(t.formAction) : o.getAttribute("formAction"), t !== null && (a = t, o = null));
			var s = new Bn("action", "action", null, r, i);
			e.push({
				event: s,
				listeners: [{
					instance: null,
					listener: function() {
						if (r.defaultPrevented) {
							if (Tf !== 0) {
								var e = new FormData(i, o);
								$s(n, {
									pending: !0,
									data: e,
									method: i.method,
									action: a
								}, null, e);
							}
						} else typeof a == "function" && (s.preventDefault(), e = new FormData(i, o), $s(n, {
							pending: !0,
							data: e,
							method: i.method,
							action: a
						}, a, e));
					},
					currentTarget: i
				}]
			});
		}
	}
	for (var Lf = 0; Lf < mi.length; Lf++) {
		var Rf = mi[Lf];
		hi(Rf.toLowerCase(), "on" + (Rf[0].toUpperCase() + Rf.slice(1)));
	}
	hi(oi, "onAnimationEnd"), hi(si, "onAnimationIteration"), hi(ci, "onAnimationStart"), hi("dblclick", "onDoubleClick"), hi("focusin", "onFocus"), hi("focusout", "onBlur"), hi(li, "onTransitionRun"), hi(ui, "onTransitionStart"), hi(di, "onTransitionCancel"), hi(fi, "onTransitionEnd"), Wt("onMouseEnter", ["mouseout", "mouseover"]), Wt("onMouseLeave", ["mouseout", "mouseover"]), Wt("onPointerEnter", ["pointerout", "pointerover"]), Wt("onPointerLeave", ["pointerout", "pointerover"]), Ut("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), Ut("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), Ut("onBeforeInput", [
		"compositionend",
		"keypress",
		"textInput",
		"paste"
	]), Ut("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), Ut("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), Ut("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
	var zf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Bf = new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(zf));
	function Vf(e, t) {
		t = !!(t & 4);
		for (var n = 0; n < e.length; n++) {
			var r = e[n], i = r.event;
			r = r.listeners;
			a: {
				var a = void 0;
				if (t) for (var o = r.length - 1; 0 <= o; o--) {
					var s = r[o], c = s.instance, l = s.currentTarget;
					if (s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						bi(e);
					}
					i.currentTarget = null, a = c;
				}
				else for (o = 0; o < r.length; o++) {
					if (s = r[o], c = s.instance, l = s.currentTarget, s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						bi(e);
					}
					i.currentTarget = null, a = c;
				}
			}
		}
	}
	function Q(e, t) {
		var n = t[Ot];
		n === void 0 && (n = t[Ot] = /* @__PURE__ */ new Set());
		var r = e + "__bubble";
		n.has(r) || (Gf(t, e, 2, !1), n.add(r));
	}
	function Hf(e, t, n) {
		var r = 0;
		t && (r |= 4), Gf(n, e, r, t);
	}
	var Uf = "_reactListening" + Math.random().toString(36).slice(2);
	function Wf(e) {
		if (!e[Uf]) {
			e[Uf] = !0, Vt.forEach(function(t) {
				t !== "selectionchange" && (Bf.has(t) || Hf(t, !1, e), Hf(t, !0, e));
			});
			var t = e.nodeType === 9 ? e : e.ownerDocument;
			t === null || t[Uf] || (t[Uf] = !0, Hf("selectionchange", !1, t));
		}
	}
	function Gf(e, t, n, r) {
		switch (Ch(t)) {
			case 2:
				var i = _h;
				break;
			case 8:
				i = vh;
				break;
			default: i = yh;
		}
		n = i.bind(null, t, n, e), i = void 0, !kn || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i === void 0 ? e.addEventListener(t, n, !0) : e.addEventListener(t, n, {
			capture: !0,
			passive: i
		}) : i === void 0 ? e.addEventListener(t, n, !1) : e.addEventListener(t, n, { passive: i });
	}
	function Kf(e, t, n, r, i) {
		var a = r;
		if (!(t & 1) && !(t & 2) && r !== null) a: for (;;) {
			if (r === null) return;
			var o = r.tag;
			if (o === 3 || o === 4) {
				var s = r.stateNode.containerInfo;
				if (s === i) break;
				if (o === 4) for (o = r.return; o !== null;) {
					var c = o.tag;
					if ((c === 3 || c === 4) && o.stateNode.containerInfo === i) return;
					o = o.return;
				}
				for (; s !== null;) {
					if (o = Ft(s), o === null) return;
					if (c = o.tag, c === 5 || c === 6 || c === 26 || c === 27) {
						r = a = o;
						continue a;
					}
					s = s.parentNode;
				}
			}
			r = r.return;
		}
		En(function() {
			var r = a, i = xn(n), o = [];
			a: {
				var s = pi.get(e);
				if (s !== void 0) {
					var c = Bn, u = e;
					switch (e) {
						case "keypress": if (Fn(n) === 0) break a;
						case "keydown":
						case "keyup":
							c = ir;
							break;
						case "focusin":
							u = "focus", c = Yn;
							break;
						case "focusout":
							u = "blur", c = Yn;
							break;
						case "beforeblur":
						case "afterblur":
							c = Yn;
							break;
						case "click": if (n.button === 2) break a;
						case "auxclick":
						case "dblclick":
						case "mousedown":
						case "mousemove":
						case "mouseup":
						case "mouseout":
						case "mouseover":
						case "contextmenu":
							c = qn;
							break;
						case "drag":
						case "dragend":
						case "dragenter":
						case "dragexit":
						case "dragleave":
						case "dragover":
						case "dragstart":
						case "drop":
							c = Jn;
							break;
						case "touchcancel":
						case "touchend":
						case "touchmove":
						case "touchstart":
							c = sr;
							break;
						case oi:
						case si:
						case ci:
							c = Xn;
							break;
						case fi:
							c = cr;
							break;
						case "scroll":
						case "scrollend":
							c = Hn;
							break;
						case "wheel":
							c = lr;
							break;
						case "copy":
						case "cut":
						case "paste":
							c = Zn;
							break;
						case "gotpointercapture":
						case "lostpointercapture":
						case "pointercancel":
						case "pointerdown":
						case "pointermove":
						case "pointerout":
						case "pointerover":
						case "pointerup":
							c = ar;
							break;
						case "submit":
							c = or;
							break;
						case "toggle":
						case "beforetoggle": c = ur;
					}
					var d = !!(t & 4), f = !d && (e === "scroll" || e === "scrollend"), p = d ? s === null ? null : s + "Capture" : s;
					d = [];
					for (var m = r, h; m !== null;) {
						var g = m;
						if (h = g.stateNode, g = g.tag, g !== 5 && g !== 26 && g !== 27 || h === null || p === null || (g = Dn(m, p), g != null && d.push(qf(m, g, h))), f) break;
						m = m.return;
					}
					0 < d.length && (s = new c(s, u, null, n, i), o.push({
						event: s,
						listeners: d
					}));
				}
			}
			if (!(t & 7)) {
				a: {
					if (c = e === "mouseover" || e === "pointerover", s = e === "mouseout" || e === "pointerout", c && n !== bn && (u = n.relatedTarget || n.fromElement) && (Ft(u) || u[Dt])) break a;
					(s || c) && (u = i.window === i ? i : (c = i.ownerDocument) ? c.defaultView || c.parentWindow : window, s ? (c = n.relatedTarget || n.toElement, s = r, c = c ? Ft(c) : null, c !== null && (f = l(c), d = c.tag, c !== f || d !== 5 && d !== 27 && d !== 6) && (c = null)) : (s = null, c = r), s !== c && (d = qn, g = "onMouseLeave", p = "onMouseEnter", m = "mouse", (e === "pointerout" || e === "pointerover") && (d = ar, g = "onPointerLeave", p = "onPointerEnter", m = "pointer"), f = s == null ? u : Lt(s), h = c == null ? u : Lt(c), u = new d(g, m + "leave", s, n, i), u.target = f, u.relatedTarget = h, g = null, Ft(i) === r && (d = new d(p, m + "enter", c, n, i), d.target = h, d.relatedTarget = f, g = d), f = g, d = s && c ? E(s, c, Yf) : null, s !== null && Xf(o, u, s, d, !1), c !== null && f !== null && Xf(o, f, c, d, !0)));
				}
				a: {
					if (s = r ? Lt(r) : window, c = s.nodeName && s.nodeName.toLowerCase(), c === "select" || c === "input" && s.type === "file") var _ = Ar;
					else if (wr(s)) {
						if (jr) _ = Br;
						else {
							_ = Rr;
							var v = Lr;
						}
					} else c = s.nodeName, !c || c.toLowerCase() !== "input" || s.type !== "checkbox" && s.type !== "radio" ? r && hn(r.elementType) && (_ = Ar) : _ = zr;
					if (_ &&= _(e, r)) {
						Tr(o, _, n, i);
						break a;
					}
					v && v(e, s, r);
				}
				switch (v = r ? Lt(r) : window, e) {
					case "focusin":
						(wr(v) || v.contentEditable === "true") && (Xr = v, Zr = r, Qr = null);
						break;
					case "focusout":
						Qr = Zr = Xr = null;
						break;
					case "mousedown":
						$r = !0;
						break;
					case "contextmenu":
					case "mouseup":
					case "dragend":
						$r = !1, ei(o, n, i);
						break;
					case "selectionchange": if (Yr) break;
					case "keydown":
					case "keyup": ei(o, n, i);
				}
				var y;
				if (fr) b: {
					switch (e) {
						case "compositionstart":
							var b = "onCompositionStart";
							break b;
						case "compositionend":
							b = "onCompositionEnd";
							break b;
						case "compositionupdate":
							b = "onCompositionUpdate";
							break b;
					}
					b = void 0;
				}
				else br ? vr(e, n) && (b = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (b = "onCompositionStart");
				b && (hr && n.locale !== "ko" && (br || b !== "onCompositionStart" ? b === "onCompositionEnd" && br && (y = Pn()) : (jn = i, Mn = "value" in jn ? jn.value : jn.textContent, br = !0)), v = Jf(r, b), 0 < v.length && (b = new Qn(b, e, null, n, i), o.push({
					event: b,
					listeners: v
				}), y ? b.data = y : (y = yr(n), y !== null && (b.data = y)))), (y = mr ? xr(e, n) : Sr(e, n)) && (b = Jf(r, "onBeforeInput"), 0 < b.length && (v = new Qn("onBeforeInput", "beforeinput", null, n, i), o.push({
					event: v,
					listeners: b
				}), v.data = y)), If(o, e, r, n, i);
			}
			Vf(o, t);
		});
	}
	function qf(e, t, n) {
		return {
			instance: e,
			listener: t,
			currentTarget: n
		};
	}
	function Jf(e, t) {
		for (var n = t + "Capture", r = []; e !== null;) {
			var i = e, a = i.stateNode;
			if (i = i.tag, i !== 5 && i !== 26 && i !== 27 || a === null || (i = Dn(e, n), i != null && r.unshift(qf(e, i, a)), i = Dn(e, t), i != null && r.push(qf(e, i, a))), e.tag === 3) return r;
			e = e.return;
		}
		return [];
	}
	function Yf(e) {
		if (e === null) return null;
		do
			e = e.return;
		while (e && e.tag !== 5 && e.tag !== 27);
		return e || null;
	}
	function Xf(e, t, n, r, i) {
		for (var a = t._reactName, o = []; n !== null && n !== r;) {
			var s = n, c = s.alternate, l = s.stateNode;
			if (s = s.tag, c !== null && c === r) break;
			s !== 5 && s !== 26 && s !== 27 || l === null || (c = l, i ? (l = Dn(n, a), l != null && o.unshift(qf(n, l, c))) : i || (l = Dn(n, a), l != null && o.push(qf(n, l, c)))), n = n.return;
		}
		o.length !== 0 && e.push({
			event: t,
			listeners: o
		});
	}
	var Zf = /\r\n?/g, Qf = /\u0000|\uFFFD/g;
	function $f(e) {
		return (typeof e == "string" ? e : "" + e).replace(Zf, "\n").replace(Qf, "");
	}
	function ep(e, t) {
		return t = $f(t), $f(e) === t;
	}
	function $(e, t, n, r, i, a) {
		switch (n) {
			case "children":
				if (typeof r == "string") t === "body" || t === "textarea" && r === "" || dn(e, r);
				else if (typeof r == "number" || typeof r == "bigint") t !== "body" && dn(e, "" + r);
				else return;
				break;
			case "className":
				L(e, "class", r);
				break;
			case "tabIndex":
				L(e, "tabindex", r);
				break;
			case "dir":
			case "role":
			case "viewBox":
			case "width":
			case "height":
				L(e, n, r);
				break;
			case "style":
				mn(e, r, a);
				return;
			case "data": if (t !== "object") {
				L(e, "data", r);
				break;
			}
			case "src":
			case "href":
				if (r === "" && (t !== "a" || n !== "href") || r == null || typeof r == "function" || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = vn(r), e.setAttribute(n, r);
				break;
			case "action":
			case "formAction":
				if (typeof r == "function") {
					e.setAttribute(n, "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");
					break;
				}
				if (typeof a == "function" && (n === "formAction" ? (t !== "input" && $(e, t, "name", i.name, i, null), $(e, t, "formEncType", i.formEncType, i, null), $(e, t, "formMethod", i.formMethod, i, null), $(e, t, "formTarget", i.formTarget, i, null)) : ($(e, t, "encType", i.encType, i, null), $(e, t, "method", i.method, i, null), $(e, t, "target", i.target, i, null))), r == null || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = vn(r), e.setAttribute(n, r);
				break;
			case "onClick":
				r != null && (e.onclick = yn);
				return;
			case "onScroll":
				r != null && Q("scroll", e);
				return;
			case "onScrollEnd":
				r != null && Q("scrollend", e);
				return;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(s(61));
					if (n = r.__html, n != null) {
						if (i.children != null) throw Error(s(60));
						a?.__html !== n && (e.innerHTML = n);
					}
				}
				break;
			case "multiple":
				e.multiple = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "muted":
				e.muted = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "defaultValue":
			case "defaultChecked":
			case "innerHTML":
			case "ref": break;
			case "autoFocus": break;
			case "xlinkHref":
				if (r == null || typeof r == "function" || typeof r == "boolean" || typeof r == "symbol") {
					e.removeAttribute("xlink:href");
					break;
				}
				n = vn(r), e.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", n);
				break;
			case "contentEditable":
			case "spellCheck":
			case "draggable":
			case "value":
			case "autoReverse":
			case "externalResourcesRequired":
			case "focusable":
			case "preserveAlpha":
				r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "inert":
			case "allowFullScreen":
			case "async":
			case "autoPlay":
			case "controls":
			case "credentialless":
			case "default":
			case "defer":
			case "disabled":
			case "disablePictureInPicture":
			case "disableRemotePlayback":
			case "formNoValidate":
			case "hidden":
			case "loop":
			case "noModule":
			case "noValidate":
			case "open":
			case "playsInline":
			case "readOnly":
			case "required":
			case "reversed":
			case "scoped":
			case "seamless":
			case "itemScope":
				r && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, "") : e.removeAttribute(n);
				break;
			case "capture":
			case "download":
				!0 === r ? e.setAttribute(n, "") : !1 !== r && r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "cols":
			case "rows":
			case "size":
			case "span":
				r != null && typeof r != "function" && typeof r != "symbol" && !isNaN(r) && 1 <= r ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "rowSpan":
			case "start":
				r == null || typeof r == "function" || typeof r == "symbol" || isNaN(r) ? e.removeAttribute(n) : e.setAttribute(n, r);
				break;
			case "popover":
				Q("beforetoggle", e), Q("toggle", e), Xt(e, "popover", r);
				break;
			case "xlinkActuate":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:actuate", r);
				break;
			case "xlinkArcrole":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:arcrole", r);
				break;
			case "xlinkRole":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:role", r);
				break;
			case "xlinkShow":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:show", r);
				break;
			case "xlinkTitle":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:title", r);
				break;
			case "xlinkType":
				Zt(e, "http://www.w3.org/1999/xlink", "xlink:type", r);
				break;
			case "xmlBase":
				Zt(e, "http://www.w3.org/XML/1998/namespace", "xml:base", r);
				break;
			case "xmlLang":
				Zt(e, "http://www.w3.org/XML/1998/namespace", "xml:lang", r);
				break;
			case "xmlSpace":
				Zt(e, "http://www.w3.org/XML/1998/namespace", "xml:space", r);
				break;
			case "is":
				Xt(e, "is", r);
				break;
			case "innerText":
			case "textContent": return;
			default: if (!(2 < n.length) || n[0] !== "o" && n[0] !== "O" || n[1] !== "n" && n[1] !== "N") n = gn.get(n) || n, Xt(e, n, r);
			else return;
		}
		I = !0;
	}
	function tp(e, t, n, r, i, a) {
		switch (n) {
			case "style":
				mn(e, r, a);
				return;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(s(61));
					if (n = r.__html, n != null) {
						if (i.children != null) throw Error(s(60));
						a?.__html !== n && (e.innerHTML = n);
					}
				}
				break;
			case "children":
				if (typeof r == "string") dn(e, r);
				else if (typeof r == "number" || typeof r == "bigint") dn(e, "" + r);
				else return;
				break;
			case "onScroll":
				r != null && Q("scroll", e);
				return;
			case "onScrollEnd":
				r != null && Q("scrollend", e);
				return;
			case "onClick":
				r != null && (e.onclick = yn);
				return;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "innerHTML":
			case "ref": return;
			case "innerText":
			case "textContent": return;
			default:
				if (!Ht.hasOwnProperty(n)) a: {
					if (n[0] === "o" && n[1] === "n" && (i = n.endsWith("Capture"), a = n.slice(2, i ? n.length - 7 : void 0), t = e[Et] || null, t = t == null ? null : t[n], typeof t == "function" && e.removeEventListener(a, t, i), typeof r == "function")) {
						typeof t != "function" && t !== null && (n in e ? e[n] = null : e.hasAttribute(n) && e.removeAttribute(n)), e.addEventListener(a, r, i);
						break a;
					}
					I = !0, n in e ? e[n] = r : !0 === r ? e.setAttribute(n, "") : Xt(e, n, r);
				}
				return;
		}
		I = !0;
	}
	function np(e, t, n) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "img":
				Q("error", e), Q("load", e);
				var r = !1, i = !1, a;
				for (a in n) if (n.hasOwnProperty(a)) {
					var o = n[a];
					if (o != null) switch (a) {
						case "src":
							r = !0;
							break;
						case "srcSet":
							i = !0;
							break;
						case "children":
						case "dangerouslySetInnerHTML": throw Error(s(137, t));
						default: $(e, t, a, o, n, null);
					}
				}
				i && $(e, t, "srcSet", n.srcSet, n, null), r && $(e, t, "src", n.src, n, null);
				return;
			case "input":
				Q("invalid", e);
				var c = a = o = i = null, l = null, u = null;
				for (r in n) if (n.hasOwnProperty(r)) {
					var d = n[r];
					if (d != null) switch (r) {
						case "name":
							i = d;
							break;
						case "type":
							o = d;
							break;
						case "checked":
							l = d;
							break;
						case "defaultChecked":
							u = d;
							break;
						case "value":
							a = d;
							break;
						case "defaultValue":
							c = d;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (d != null) throw Error(s(137, t));
							break;
						default: $(e, t, r, d, n, null);
					}
				}
				sn(e, a, c, l, u, o, i, !1);
				return;
			case "select":
				for (i in Q("invalid", e), r = o = a = null, n) if (n.hasOwnProperty(i) && (c = n[i], c != null)) switch (i) {
					case "value":
						a = c;
						break;
					case "defaultValue":
						o = c;
						break;
					case "multiple": r = c;
					default: $(e, t, i, c, n, null);
				}
				t = a, n = o, e.multiple = !!r, t == null ? n != null && R(e, !!r, n, !0) : R(e, !!r, t, !1);
				return;
			case "textarea":
				for (o in Q("invalid", e), a = i = r = null, n) if (n.hasOwnProperty(o) && (c = n[o], c != null)) switch (o) {
					case "value":
						r = c;
						break;
					case "defaultValue":
						i = c;
						break;
					case "children":
						a = c;
						break;
					case "dangerouslySetInnerHTML":
						if (c != null) throw Error(s(91));
						break;
					default: $(e, t, o, c, n, null);
				}
				un(e, r, i, a);
				return;
			case "option":
				for (l in n) if (n.hasOwnProperty(l) && (r = n[l], r != null)) switch (l) {
					case "selected":
						e.selected = r && typeof r != "function" && typeof r != "symbol";
						break;
					default: $(e, t, l, r, n, null);
				}
				return;
			case "dialog":
				Q("beforetoggle", e), Q("toggle", e), Q("cancel", e), Q("close", e);
				break;
			case "iframe":
			case "object":
				Q("load", e);
				break;
			case "video":
			case "audio":
				for (r = 0; r < zf.length; r++) Q(zf[r], e);
				break;
			case "image":
				Q("error", e), Q("load", e);
				break;
			case "details":
				Q("toggle", e);
				break;
			case "embed":
			case "source":
			case "link": Q("error", e), Q("load", e);
			case "area":
			case "base":
			case "br":
			case "col":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "track":
			case "wbr":
			case "menuitem":
				for (u in n) if (n.hasOwnProperty(u) && (r = n[u], r != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(s(137, t));
					default: $(e, t, u, r, n, null);
				}
				return;
			default: if (hn(t)) {
				for (d in n) n.hasOwnProperty(d) && (r = n[d], r !== void 0 && tp(e, t, d, r, n, void 0));
				return;
			}
		}
		for (c in n) n.hasOwnProperty(c) && (r = n[c], r != null && $(e, t, c, r, n, null));
	}
	var rp = {};
	function ip(e, t, n, r) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "input":
				var i = null, a = null, o = null, c = null, l = null, u = null, d = null;
				for (m in n) {
					var f = n[m];
					if (n.hasOwnProperty(m) && f != null) switch (m) {
						case "checked": break;
						case "value": break;
						case "defaultValue": l = f;
						default: r.hasOwnProperty(m) || $(e, t, m, null, r, f);
					}
				}
				for (var p in r) {
					var m = r[p];
					if (f = n[p], r.hasOwnProperty(p) && (m != null || f != null)) switch (p) {
						case "type":
							m !== f && (I = !0), a = m;
							break;
						case "name":
							m !== f && (I = !0), i = m;
							break;
						case "checked":
							m !== f && (I = !0), u = m;
							break;
						case "defaultChecked":
							m !== f && (I = !0), d = m;
							break;
						case "value":
							m !== f && (I = !0), o = m;
							break;
						case "defaultValue":
							m !== f && (I = !0), c = m;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (m != null) throw Error(s(137, t));
							break;
						default: m !== f && $(e, t, p, m, r, f);
					}
				}
				on(e, o, c, l, u, d, a, i);
				return;
			case "select":
				for (a in m = o = c = p = null, n) if (l = n[a], n.hasOwnProperty(a) && l != null) switch (a) {
					case "value": break;
					case "multiple": m = l;
					default: r.hasOwnProperty(a) || $(e, t, a, null, r, l);
				}
				for (i in r) if (a = r[i], l = n[i], r.hasOwnProperty(i) && (a != null || l != null)) switch (i) {
					case "value":
						a !== l && (I = !0), p = a;
						break;
					case "defaultValue":
						a !== l && (I = !0), c = a;
						break;
					case "multiple": a !== l && (I = !0), o = a;
					default: a !== l && $(e, t, i, a, r, l);
				}
				t = c, n = o, r = m, p == null ? !!r != !!n && (t == null ? R(e, !!n, n ? [] : "", !1) : R(e, !!n, t, !0)) : R(e, !!n, p, !1);
				return;
			case "textarea":
				for (c in m = p = null, n) if (i = n[c], n.hasOwnProperty(c) && i != null && !r.hasOwnProperty(c)) switch (c) {
					case "value": break;
					case "children": break;
					default: $(e, t, c, null, r, i);
				}
				for (o in r) if (i = r[o], a = n[o], r.hasOwnProperty(o) && (i != null || a != null)) switch (o) {
					case "value":
						i !== a && (I = !0), p = i;
						break;
					case "defaultValue":
						i !== a && (I = !0), m = i;
						break;
					case "children": break;
					case "dangerouslySetInnerHTML":
						if (i != null) throw Error(s(91));
						break;
					default: i !== a && $(e, t, o, i, r, a);
				}
				ln(e, p, m);
				return;
			case "option":
				for (var h in n) if (p = n[h], n.hasOwnProperty(h) && p != null && !r.hasOwnProperty(h)) switch (h) {
					case "selected":
						e.selected = !1;
						break;
					default: $(e, t, h, null, r, p);
				}
				for (l in r) if (p = r[l], m = n[l], r.hasOwnProperty(l) && p !== m && (p != null || m != null)) switch (l) {
					case "selected":
						p !== m && (I = !0), e.selected = p && typeof p != "function" && typeof p != "symbol";
						break;
					default: $(e, t, l, p, r, m);
				}
				return;
			case "img":
			case "link":
			case "area":
			case "base":
			case "br":
			case "col":
			case "embed":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "source":
			case "track":
			case "wbr":
			case "menuitem":
				for (var g in n) p = n[g], n.hasOwnProperty(g) && p != null && !r.hasOwnProperty(g) && $(e, t, g, null, r, p);
				for (u in r) if (p = r[u], m = n[u], r.hasOwnProperty(u) && p !== m && (p != null || m != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML":
						if (p != null) throw Error(s(137, t));
						break;
					default: $(e, t, u, p, r, m);
				}
				return;
			default: if (hn(t)) {
				for (var _ in n) p = n[_], n.hasOwnProperty(_) && p !== void 0 && !r.hasOwnProperty(_) && tp(e, t, _, void 0, r, p);
				for (d in r) p = r[d], m = n[d], !r.hasOwnProperty(d) || p === m || p === void 0 && m === void 0 || tp(e, t, d, p, r, m);
				return;
			}
		}
		for (var v in n) p = n[v], n.hasOwnProperty(v) && p != null && !r.hasOwnProperty(v) && $(e, t, v, null, r, p);
		for (f in r) p = r[f], m = n[f], !r.hasOwnProperty(f) || p === m || p == null && m == null || $(e, t, f, p, r, m);
	}
	function ap(e) {
		switch (e) {
			case "css":
			case "script":
			case "font":
			case "img":
			case "image":
			case "input":
			case "link": return !0;
			default: return !1;
		}
	}
	function op() {
		if (typeof performance.getEntriesByType == "function") {
			for (var e = 0, t = 0, n = performance.getEntriesByType("resource"), r = 0; r < n.length; r++) {
				var i = n[r], a = i.transferSize, o = i.initiatorType, s = i.duration;
				if (a && s && ap(o)) {
					for (o = 0, s = i.responseEnd, r += 1; r < n.length; r++) {
						var c = n[r], l = c.startTime;
						if (l > s) break;
						var u = c.transferSize, d = c.initiatorType;
						u && ap(d) && (c = c.responseEnd, o += u * (c < s ? 1 : (s - l) / (c - l)));
					}
					if (--r, t += 8 * (a + o) / (i.duration / 1e3), e++, 10 < e) break;
				}
			}
			if (0 < e) return t / e / 1e6;
		}
		return navigator.connection && (e = navigator.connection.downlink, typeof e == "number") ? e : 5;
	}
	var sp = null, cp = null;
	function lp(e) {
		return e.nodeType === 9 ? e : e.ownerDocument;
	}
	function up(e) {
		switch (e) {
			case "http://www.w3.org/2000/svg": return 1;
			case "http://www.w3.org/1998/Math/MathML": return 2;
			default: return 0;
		}
	}
	function dp(e, t) {
		if (e === 0) switch (t) {
			case "svg": return 1;
			case "math": return 2;
			default: return 0;
		}
		return e === 1 && t === "foreignObject" ? 0 : e;
	}
	function fp(e, t, n, r) {
		return n = lp(n).createElement(e), n[F] = r, n[Et] = t, np(n, e, t), zt(n), n;
	}
	function pp(e, t) {
		return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
	}
	var mp = null;
	function hp() {
		var e = window.event;
		return e && e.type === "popstate" ? e !== mp && (mp = e, !0) : (mp = null, !1);
	}
	var gp = typeof setTimeout == "function" ? setTimeout : void 0, _p = typeof clearTimeout == "function" ? clearTimeout : void 0, vp = typeof Promise == "function" ? Promise : void 0, yp = typeof requestAnimationFrame == "function" ? requestAnimationFrame : gp, bp = typeof queueMicrotask == "function" ? queueMicrotask : vp === void 0 ? gp : function(e) {
		return vp.resolve(null).then(e).catch(xp);
	};
	function xp(e) {
		setTimeout(function() {
			throw e;
		});
	}
	function Sp(e) {
		return e === "head";
	}
	function Cp(e, t) {
		var n = t, r = 0;
		do {
			var i = n.nextSibling;
			if (e.removeChild(n), i && i.nodeType === 8) {
				if (n = i.data, n === "/$" || n === "/&") {
					if (r === 0) {
						e.removeChild(i), Hh(t);
						return;
					}
					r--;
				} else if (n === "$" || n === "$?" || n === "$~" || n === "$!" || n === "&") r++;
				else if (n === "html") _m(e.ownerDocument.documentElement);
				else if (n === "head") {
					n = e.ownerDocument.head, _m(n);
					for (var a = n.firstChild; a;) {
						var o = a.nextSibling, s = a.nodeName;
						a[Mt] || s === "SCRIPT" || s === "STYLE" || s === "LINK" && a.rel.toLowerCase() === "stylesheet" || n.removeChild(a), a = o;
					}
				} else n === "body" && _m(e.ownerDocument.body);
			}
			n = i;
		} while (n);
		Hh(t);
	}
	function wp(e, t) {
		var n = e;
		e = 0;
		do {
			var r = n.nextSibling;
			if (n.nodeType === 1 ? t ? (n._stashedDisplay = n.style.display, n.style.display = "none") : (n.style.display = n._stashedDisplay || "", n.getAttribute("style") === "" && n.removeAttribute("style")) : n.nodeType === 3 && (t ? (n._stashedText = n.nodeValue, n.nodeValue = "") : n.nodeValue = n._stashedText || ""), r && r.nodeType === 8) {
				if (n = r.data, n === "/$") {
					if (e === 0) break;
					e--;
				} else n !== "$" && n !== "$?" && n !== "$~" && n !== "$!" || e++;
			}
			n = r;
		} while (n);
	}
	function Tp(e, t, n) {
		if (t = CSS.escape(t) === t ? t : "r-" + btoa(t).replace(/=/g, ""), e.style.viewTransitionName = t, n != null && (e.style.viewTransitionClass = n), n = getComputedStyle(e), n.display === "inline") {
			if (t = e.getClientRects(), t.length === 1) var r = 1;
			else for (var i = r = 0; i < t.length; i++) {
				var a = t[i];
				0 < a.width && 0 < a.height && r++;
			}
			r === 1 && (e = e.style, e.display = t.length === 1 ? "inline-block" : "block", e.marginTop = "-" + n.paddingTop, e.marginBottom = "-" + n.paddingBottom);
		}
	}
	function Ep(e, t) {
		e = e.style, t = t.style;
		var n = t == null ? null : t.hasOwnProperty("viewTransitionName") ? t.viewTransitionName : t.hasOwnProperty("view-transition-name") ? t["view-transition-name"] : null;
		e.viewTransitionName = n == null || typeof n == "boolean" ? "" : ("" + n).trim(), n = t == null ? null : t.hasOwnProperty("viewTransitionClass") ? t.viewTransitionClass : t.hasOwnProperty("view-transition-class") ? t["view-transition-class"] : null, e.viewTransitionClass = n == null || typeof n == "boolean" ? "" : ("" + n).trim(), e.display === "inline-block" && (t == null ? e.display = e.margin = "" : (n = t.display, e.display = n == null || typeof n == "boolean" ? "" : n, n = t.margin, n == null ? (n = t.hasOwnProperty("marginTop") ? t.marginTop : t["margin-top"], e.marginTop = n == null || typeof n == "boolean" ? "" : n, t = t.hasOwnProperty("marginBottom") ? t.marginBottom : t["margin-bottom"], e.marginBottom = t == null || typeof t == "boolean" ? "" : t) : e.margin = n));
	}
	function Dp(e, t, n) {
		return n = n.ownerDocument.defaultView, {
			rect: e,
			abs: t.position === "absolute" || t.position === "fixed",
			clip: t.clipPath !== "none" || t.overflow !== "visible" || t.filter !== "none" || t.mask !== "none" || t.mask !== "none" || t.borderRadius !== "0px",
			view: 0 <= e.bottom && 0 <= e.right && e.top <= n.innerHeight && e.left <= n.innerWidth
		};
	}
	function Op(e) {
		return Dp(e.getBoundingClientRect(), getComputedStyle(e), e);
	}
	function kp(e) {
		var t = e.getBoundingClientRect();
		t = new DOMRect(t.x + 2e4, t.y + 2e4, t.width, t.height);
		var n = getComputedStyle(e);
		return Dp(t, n, e);
	}
	function Ap(e) {
		return e.documentElement.clientHeight;
	}
	function jp(e) {
		this.addEventListener("load", e), this.addEventListener("error", e);
	}
	function Mp(e, t, n, r, i, a, o, s, c) {
		var l = t.nodeType === 9 ? t : t.ownerDocument;
		try {
			var u = l.startViewTransition({
				update: function() {
					var t = l.defaultView, n = t.navigation && t.navigation.transition, o = l.fonts.status;
					r();
					var s = [];
					if (o === "loaded" && (Ap(l), l.fonts.status === "loading" && s.push(l.fonts.ready)), o = s.length, e !== null) for (var c = e.suspenseyImages, u = 0, d = 0; d < c.length; d++) {
						var f = c[d];
						if (!f.complete) {
							var p = f.getBoundingClientRect();
							if (0 < p.bottom && 0 < p.right && p.top < t.innerHeight && p.left < t.innerWidth) {
								if (u += Xm(f), u > $m) {
									s.length = o;
									break;
								}
								f = new Promise(jp.bind(f)), s.push(f);
							}
						}
					}
					if (0 < s.length) return t = Promise.race([Promise.all(s), new Promise(function(e) {
						return setTimeout(e, 500);
					})]).then(i, i), (n ? Promise.allSettled([n.finished, t]) : t).then(a, a);
					if (i(), n) return n.finished.then(a, a);
					a();
				},
				types: n
			});
			l.__reactViewTransition = u;
			var d = [];
			return u.ready.then(function() {
				for (var e = l.documentElement.getAnimations({ subtree: !0 }), t = 0; t < e.length; t++) {
					var n = e[t], r = n.effect, i = r.pseudoElement;
					if (i != null && i.startsWith("::view-transition")) {
						d.push(n), n = r.getKeyframes();
						for (var a = i = void 0, s = !0, c = 0; c < n.length; c++) {
							var u = n[c], f = u.width;
							if (i === void 0) i = f;
							else if (i !== f) {
								s = !1;
								break;
							}
							if (f = u.height, a === void 0) a = f;
							else if (a !== f) {
								s = !1;
								break;
							}
							delete u.width, delete u.height, u.transform === "none" && delete u.transform;
						}
						s && i !== void 0 && a !== void 0 && (r.setKeyframes(n), s = getComputedStyle(r.target, r.pseudoElement), s.width !== i || s.height !== a) && (s = n[0], s.width = i, s.height = a, s = n[n.length - 1], s.width = i, s.height = a, r.setKeyframes(n));
					}
				}
				o();
			}, function(e) {
				l.__reactViewTransition === u && (l.__reactViewTransition = null);
				try {
					if (typeof e == "object" && e) switch (e.name) {
						case "InvalidStateError": (e.message === "View transition was skipped because document visibility state is hidden." || e.message === "Skipping view transition because document visibility state has become hidden." || e.message === "Skipping view transition because viewport size changed." || e.message === "Transition was aborted because of invalid state") && (e = null);
					}
					e !== null && c(e);
				} finally {
					r(), i(), o();
				}
			}), u.finished.finally(function() {
				for (var e = 0; e < d.length; e++) d[e].cancel();
				l.__reactViewTransition === u && (l.__reactViewTransition = null), s();
			}), u;
		} catch {
			return r(), i(), o(), null;
		}
	}
	function Np(e, t) {
		this._scope = document.documentElement, this._selector = "::view-transition-" + e + "(" + t + ")";
	}
	Np.prototype.animate = function(e, t) {
		return t = typeof t == "number" ? { duration: t } : D({}, t), t.pseudoElement = this._selector, this._scope.animate(e, t);
	}, Np.prototype.getAnimations = function() {
		for (var e = this._scope, t = this._selector, n = e.getAnimations({ subtree: !0 }), r = [], i = 0; i < n.length; i++) {
			var a = n[i].effect;
			a !== null && a.target === e && a.pseudoElement === t && r.push(n[i]);
		}
		return r;
	}, Np.prototype.getComputedStyle = function() {
		return getComputedStyle(this._scope, this._selector);
	};
	function Pp(e) {
		return {
			name: e,
			group: new Np("group", e),
			imagePair: new Np("image-pair", e),
			old: new Np("old", e),
			new: new Np("new", e)
		};
	}
	function Fp(e) {
		this._fragmentFiber = e, this._observers = this._eventListeners = null;
	}
	Fp.prototype.addEventListener = function(e, t, n) {
		var r = null, i = null;
		if (!(n != null && typeof n != "boolean" && (r = n.signal || null, r !== null && r.aborted))) {
			this._eventListeners === null && (this._eventListeners = []);
			var a = this._eventListeners;
			if (Bp(a, e, t, n) === -1) {
				var o = this, s = t;
				n != null && typeof n != "boolean" && !0 === n.once && (s = function(r) {
					o.removeEventListener(e, t, n), typeof t == "function" ? t.call(this, r) : t.handleEvent(r);
				}), r !== null && (i = o.removeEventListener.bind(o, e, t, n), r.addEventListener("abort", i, { once: !0 }), i = r.removeEventListener.bind(r, "abort", i)), r = Rp(n), a.push({
					type: e,
					listener: t,
					optionsOrUseCapture: n,
					attachedListener: s,
					cleanup: i
				}), h(this._fragmentFiber.child, !1, Ip, e, s, r);
			}
			this._eventListeners = a;
		}
	};
	function Ip(e, t, n, r) {
		return b(e).addEventListener(t, n, r), !1;
	}
	Fp.prototype.removeEventListener = function(e, t, n) {
		var r = this._eventListeners;
		if (r !== null && (t = Bp(r, e, t, n), t !== -1)) {
			var i = r[t];
			n = i.attachedListener;
			var a = i.cleanup;
			i = Rp(i.optionsOrUseCapture), h(this._fragmentFiber.child, !1, Lp, e, n, i), r.splice(t, 1), a !== null && a();
		}
	};
	function Lp(e, t, n, r) {
		return b(e).removeEventListener(t, n, r), !1;
	}
	function Rp(e) {
		return e != null && typeof e != "boolean" && (!0 === e.once || e.signal instanceof AbortSignal) ? {
			capture: e.capture,
			passive: e.passive
		} : e;
	}
	function zp(e) {
		return e == null ? "c=0" : typeof e == "boolean" ? "c=" + (e ? "1" : "0") : "c=" + (e.capture ? "1" : "0");
	}
	function Bp(e, t, n, r) {
		if (e.length === 0) return -1;
		r = zp(r);
		for (var i = 0; i < e.length; i++) {
			var a = e[i];
			if (a.type === t && a.listener === n && zp(a.optionsOrUseCapture) === r) return i;
		}
		return -1;
	}
	Fp.prototype.dispatchEvent = function(e) {
		var t = g(this._fragmentFiber);
		if (t === null) return !0;
		t = b(t);
		var n = this._eventListeners;
		if (n !== null && 0 < n.length || !e.bubbles) {
			var r = t.nodeType === 9 ? t.createComment("") : document.createTextNode("");
			if (n) for (var i = 0; i < n.length; i++) {
				var a = n[i];
				r.addEventListener(a.type, a.attachedListener, Rp(a.optionsOrUseCapture));
			}
			if (t.appendChild(r), e = r.dispatchEvent(e), n) for (i = 0; i < n.length; i++) a = n[i], r.removeEventListener(a.type, a.attachedListener, Rp(a.optionsOrUseCapture));
			return t.removeChild(r), e;
		}
		return t.dispatchEvent(e);
	}, Fp.prototype.focus = function(e) {
		h(this._fragmentFiber.child, !0, Vp, e, void 0, void 0);
	};
	function Vp(e, t) {
		return e.tag !== 6 && (e = b(e), pm(e, t));
	}
	Fp.prototype.focusLast = function(e) {
		var t = [];
		h(this._fragmentFiber.child, !0, Hp, t, void 0, void 0);
		for (var n = t.length - 1; 0 <= n && !Vp(t[n], e); n--);
	};
	function Hp(e, t) {
		return t.push(e), !1;
	}
	Fp.prototype.blur = function() {
		var e = g(this._fragmentFiber);
		e !== null && (e = b(e), e = lp(e).activeElement, e !== null && h(this._fragmentFiber.child, !1, Up, e, void 0, void 0));
	};
	function Up(e, t) {
		return e.tag !== 6 && (e = b(e), e === t || e.contains(t) ? (t.blur(), !0) : !1);
	}
	Fp.prototype.observeUsing = function(e) {
		this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(e), h(this._fragmentFiber.child, !1, Wp, e, void 0, void 0);
	};
	function Wp(e, t) {
		return e.tag === 6 || (e = b(e), t.observe(e)), !1;
	}
	Fp.prototype.unobserveUsing = function(e) {
		var t = this._observers;
		if (t !== null && t.has(e)) {
			t.delete(e), h(this._fragmentFiber.child, !1, Gp, e, void 0, void 0);
			for (var n = t = 0; n < Kp.length; n++) {
				var r = Kp[n];
				r.fragmentInstance === this && r.observer === e ? e.unobserve(r.instance) : Kp[t++] = r;
			}
			Kp.length = t;
		}
	};
	function Gp(e, t) {
		return e.tag === 6 || (e = b(e), t.unobserve(e)), !1;
	}
	var Kp = [], qp = !1;
	function Jp(e, t, n) {
		Kp.push({
			fragmentInstance: e,
			observer: t,
			instance: n
		}), qp || (qp = !0, mm(function() {
			qp = !1;
			var e = Kp;
			Kp = [];
			for (var t = 0; t < e.length; t++) {
				var n = e[t];
				n.observer.unobserve(n.instance);
			}
		}));
	}
	Fp.prototype.getClientRects = function() {
		var e = [];
		return h(this._fragmentFiber.child, !1, Yp, e, void 0, void 0), e;
	};
	function Yp(e, t) {
		if (e.tag === 6) {
			e = e.stateNode;
			var n = e.ownerDocument.createRange();
			n.selectNodeContents(e), t.push.apply(t, n.getClientRects());
		} else e = b(e), t.push.apply(t, e.getClientRects());
		return !1;
	}
	Fp.prototype.getRootNode = function(e) {
		var t = g(this._fragmentFiber);
		return t === null ? this : b(t).getRootNode(e);
	}, Fp.prototype.compareDocumentPosition = function(e) {
		var t = g(this._fragmentFiber);
		if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
		var n = [];
		h(this._fragmentFiber.child, !1, Hp, n, void 0, void 0);
		var r = b(t);
		if (n.length === 0) {
			if (n = r, _(this._fragmentFiber)) {
				a: {
					for (t = this._fragmentFiber.return; t !== null;) {
						if (t.tag === 4) {
							t = t.stateNode.containerInfo;
							break a;
						}
						if (t.tag === 3 || t.tag === 5 || t.tag === 27) break;
						t = t.return;
					}
					t = null;
				}
				t != null && (n = t);
			}
			t = this._fragmentFiber;
			var i = r = n.compareDocumentPosition(e);
			return n === e ? i = Node.DOCUMENT_POSITION_CONTAINS : r & Node.DOCUMENT_POSITION_CONTAINED_BY && (n = v(t)[1], n === null ? i = Node.DOCUMENT_POSITION_PRECEDING : (e = b(n).compareDocumentPosition(e), i = e === 0 || e & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), i |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
		}
		t = b(n[0]), i = b(n[n.length - 1]);
		var a = _(this._fragmentFiber) ? t.parentElement : r;
		if (a == null) return Node.DOCUMENT_POSITION_DISCONNECTED;
		r = a.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_CONTAINED_BY, a = a.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_CONTAINED_BY;
		var o = t.compareDocumentPosition(e), s = i.compareDocumentPosition(e), c = o & Node.DOCUMENT_POSITION_CONTAINED_BY || s & Node.DOCUMENT_POSITION_CONTAINED_BY;
		return s = r && a && o & Node.DOCUMENT_POSITION_FOLLOWING && s & Node.DOCUMENT_POSITION_PRECEDING, t = r && t === e || a && i === e || c || s ? Node.DOCUMENT_POSITION_CONTAINED_BY : !r && t === e || !a && i === e ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : o, t & Node.DOCUMENT_POSITION_DISCONNECTED || t & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || Xp(t, this._fragmentFiber, n[0], n[n.length - 1], e) ? t : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
	};
	function Xp(e, t, n, r, i) {
		var a = Ft(i);
		if (e & Node.DOCUMENT_POSITION_CONTAINED_BY) {
			if (n = !!a) a: {
				for (; a !== null;) {
					if (a.tag === 7 && (a === t || a.alternate === t)) {
						n = !0;
						break a;
					}
					a = a.return;
				}
				n = !1;
			}
			return n;
		}
		if (e & Node.DOCUMENT_POSITION_CONTAINS) {
			if (a === null) return a = i.ownerDocument, i === a || i === a.documentElement || i === a.body;
			a: {
				for (a = t, t = g(t); a !== null;) {
					if (!(a.tag !== 5 && a.tag !== 3 && a.tag !== 27 || a !== t && a.alternate !== t)) {
						a = !0;
						break a;
					}
					a = a.return;
				}
				a = !1;
			}
			return a;
		}
		return e & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!a) && !(t = a === n) && (t = E(n, a, T), t === null ? t = !1 : (h(t, !0, C, a, n), a = x, x = null, t = a !== null)), t) : e & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!a) && !(t = a === r) && (t = E(r, a, T), t === null ? t = !1 : (h(t, !0, w, a, r), a = x, S = x = null, t = a !== null)), t) : !1;
	}
	function Zp(e, t) {
		var n = e.ownerDocument.createRange();
		n.selectNodeContents(e), e = n.getBoundingClientRect(), window.scrollTo(window.scrollX + e.left, t ? window.scrollY + e.top : window.scrollY + e.bottom - window.innerHeight);
	}
	Fp.prototype.scrollIntoView = function(e) {
		if (typeof e == "object") throw Error(s(566));
		var t = [];
		h(this._fragmentFiber.child, !1, Hp, t, void 0, void 0);
		var n = !1 !== e;
		if (t.length === 0) {
			var r = v(this._fragmentFiber);
			if (r = n ? r[1] || r[0] || g(this._fragmentFiber) : r[0] || r[1], r === null) return;
			if (r.tag === 6) {
				e = b(r), Zp(e, n);
				return;
			}
			if (r = b(r), r.nodeType !== 9) {
				if (r.nodeType === 11) {
					n = "host" in r ? r.host : null, n !== null && n.scrollIntoView(e);
					return;
				}
				r.scrollIntoView(e);
			}
		}
		for (r = n ? t.length - 1 : 0; r !== (n ? -1 : t.length);) {
			var i = t[r];
			i.tag === 6 ? (i = b(i), Zp(i, n)) : b(i).scrollIntoView(e), r += n ? -1 : 1;
		}
	};
	function Qp(e, t) {
		return e = b(e), $p(e, t), !1;
	}
	function $p(e, t) {
		e.reactFragments ??= /* @__PURE__ */ new Set(), e.reactFragments.add(t);
	}
	function em(e, t) {
		var n = t._eventListeners;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = n[r];
			e.addEventListener(i.type, i.attachedListener, Rp(i.optionsOrUseCapture));
		}
		e.nodeType !== 3 && (n = t._observers, n !== null && n.forEach(function(n) {
			for (var r = 0, i = 0; i < Kp.length; i++) {
				var a = Kp[i];
				(a.fragmentInstance !== t || a.observer !== n || a.instance !== e) && (Kp[r++] = a);
			}
			Kp.length = r, n.observe(e);
		}), $p(e, t));
	}
	function tm(e, t) {
		var n = t._eventListeners;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = n[r];
			e.removeEventListener(i.type, i.attachedListener, Rp(i.optionsOrUseCapture));
		}
		e.nodeType !== 3 && (n = t._observers, n !== null && n.forEach(function(n) {
			typeof n.rootMargin == "string" ? Jp(t, n, e) : n.unobserve(e);
		}), e.reactFragments != null && e.reactFragments.delete(t));
	}
	function nm(e) {
		var t = e.firstChild;
		for (t && t.nodeType === 10 && (t = t.nextSibling); t;) {
			var n = t;
			switch (t = t.nextSibling, n.nodeName) {
				case "HTML":
				case "HEAD":
				case "BODY":
					nm(n), Pt(n);
					continue;
				case "SCRIPT":
				case "STYLE": continue;
				case "LINK": if (n.rel.toLowerCase() === "stylesheet") continue;
			}
			e.removeChild(n);
		}
	}
	function rm(e, t, n, r) {
		for (; e.nodeType === 1;) {
			var i = n;
			if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
				if (!r && (e.nodeName !== "INPUT" || e.type !== "hidden")) break;
			} else if (!r) {
				if (t === "input" && e.type === "hidden") {
					var a = i.name == null ? null : "" + i.name;
					if (i.type === "hidden" && e.getAttribute("name") === a) return e;
				} else return e;
			} else if (!e[Mt]) switch (t) {
				case "meta":
					if (!e.hasAttribute("itemprop")) break;
					return e;
				case "link":
					if (a = e.getAttribute("rel"), a === "stylesheet" && e.hasAttribute("data-precedence") || a !== i.rel || e.getAttribute("href") !== (i.href == null || i.href === "" ? null : i.href) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin) || e.getAttribute("title") !== (i.title == null ? null : i.title)) break;
					return e;
				case "style":
					if (e.hasAttribute("data-precedence")) break;
					return e;
				case "script":
					if (a = e.getAttribute("src"), (a !== (i.src == null ? null : i.src) || e.getAttribute("type") !== (i.type == null ? null : i.type) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin)) && a && e.hasAttribute("async") && !e.hasAttribute("itemprop")) break;
					return e;
				default: return e;
			}
			if (e = lm(e.nextSibling), e === null) break;
		}
		return null;
	}
	function im(e, t, n) {
		if (t === "") return null;
		for (; e.nodeType !== 3;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !n || (e = lm(e.nextSibling), e === null)) return null;
		return e;
	}
	function am(e, t) {
		for (; e.nodeType !== 8;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !t || (e = lm(e.nextSibling), e === null)) return null;
		return e;
	}
	function om(e) {
		return e.data === "$?" || e.data === "$~";
	}
	function sm(e) {
		return e.data === "$!" || e.data === "$?" && e.ownerDocument.readyState !== "loading";
	}
	function cm(e, t) {
		var n = e.ownerDocument;
		if (e.data === "$~") e._reactRetry = t;
		else if (e.data !== "$?" || n.readyState !== "loading") t();
		else {
			var r = function() {
				t(), n.removeEventListener("DOMContentLoaded", r);
			};
			n.addEventListener("DOMContentLoaded", r), e._reactRetry = r;
		}
	}
	function lm(e) {
		for (; e != null; e = e.nextSibling) {
			var t = e.nodeType;
			if (t === 1 || t === 3) break;
			if (t === 8) {
				if (t = e.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F") break;
				if (t === "/$" || t === "/&") return null;
			}
		}
		return e;
	}
	var um = null;
	function dm(e) {
		e = e.nextSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "/$" || n === "/&") {
					if (t === 0) return lm(e.nextSibling);
					t--;
				} else n !== "$" && n !== "$!" && n !== "$?" && n !== "$~" && n !== "&" || t++;
			}
			e = e.nextSibling;
		}
		return null;
	}
	function fm(e) {
		e = e.previousSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "$" || n === "$!" || n === "$?" || n === "$~" || n === "&") {
					if (t === 0) return e;
					t--;
				} else n !== "/$" && n !== "/&" || t++;
			}
			e = e.previousSibling;
		}
		return null;
	}
	function pm(e, t) {
		function n() {
			r = !0;
		}
		if (e.ownerDocument.activeElement === e) return !0;
		var r = !1;
		try {
			e.ownerDocument.addEventListener("focus", n, !0), (e.focus || HTMLElement.prototype.focus).call(e, t);
		} finally {
			e.ownerDocument.removeEventListener("focus", n, !0);
		}
		return r;
	}
	function mm(e) {
		yp(function() {
			yp(function(t) {
				return e(t);
			});
		});
	}
	function hm(e, t, n) {
		switch (t = lp(n), e) {
			case "html":
				if (e = t.documentElement, !e) throw Error(s(452));
				return e;
			case "head":
				if (e = t.head, !e) throw Error(s(453));
				return e;
			case "body":
				if (e = t.body, !e) throw Error(s(454));
				return e;
			default: throw Error(s(451));
		}
	}
	function gm(e, t, n) {
		for (var r in n) {
			var i = n[r];
			n.hasOwnProperty(r) && i != null && $(e, t, r, null, rp, i);
		}
		n.dangerouslySetInnerHTML != null && (e.textContent = ""), e.onclick === yn && (e.onclick = null), Pt(e);
	}
	function _m(e) {
		for (var t = e.attributes; t.length;) e.removeAttributeNode(t[0]);
		Pt(e);
	}
	var vm = /* @__PURE__ */ new Map(), ym = /* @__PURE__ */ new Set();
	function bm(e) {
		if (typeof e.getRootNode == "function") {
			var t = e.getRootNode();
			if (t.nodeType === 9 || t.nodeType === 11) return t;
		}
		return e.nodeType === 9 ? e : e.ownerDocument;
	}
	var xm = N.d;
	N.d = {
		f: Sm,
		r: Cm,
		D: Em,
		C: Dm,
		L: Om,
		m: km,
		X: jm,
		S: Am,
		M: Mm
	};
	function Sm() {
		var e = xm.f(), t = zd();
		return e || t;
	}
	function Cm(e) {
		var t = It(e);
		t !== null && t.tag === 5 && t.type === "form" ? tc(t) : xm.r(e);
	}
	var wm = typeof document > "u" ? null : document;
	function Tm(e, t, n) {
		var r = wm;
		if (r && typeof t == "string" && t) {
			var i = an(t);
			i = "link[rel=\"" + e + "\"][href=\"" + i + "\"]", typeof n == "string" && (i += "[crossorigin=\"" + n + "\"]"), ym.has(i) || (ym.add(i), e = {
				rel: e,
				crossOrigin: n,
				href: t
			}, r.querySelector(i) === null && (t = r.createElement("link"), np(t, "link", e), zt(t), r.head.appendChild(t)));
		}
	}
	function Em(e) {
		xm.D(e), Tm("dns-prefetch", e, null);
	}
	function Dm(e, t) {
		xm.C(e, t), Tm("preconnect", e, t);
	}
	function Om(e, t, n) {
		xm.L(e, t, n);
		var r = wm;
		if (r && e && t) {
			var i = "link[rel=\"preload\"][as=\"" + an(t) + "\"]";
			t === "image" && n && n.imageSrcSet ? (i += "[imagesrcset=\"" + an(n.imageSrcSet) + "\"]", typeof n.imageSizes == "string" && (i += "[imagesizes=\"" + an(n.imageSizes) + "\"]")) : i += "[href=\"" + an(e) + "\"]";
			var a = i;
			switch (t) {
				case "style":
					a = Pm(e);
					break;
				case "script": a = Rm(e);
			}
			if (!(vm.has(a) || (e = D({
				rel: "preload",
				href: t === "image" && n && n.imageSrcSet ? void 0 : e,
				as: t
			}, n), vm.set(a, e), r.querySelector(i) !== null || t === "style" && r.querySelector(Fm(a)) || t === "script" && r.querySelector(zm(a))))) {
				var o = r.createElement("link");
				np(o, "link", e), t === "style" && (o[Nt] = !0, o.onload = o.onerror = function() {
					Bt(o);
				}), zt(o), r.head.appendChild(o);
			}
		}
	}
	function km(e, t) {
		xm.m(e, t);
		var n = wm;
		if (n && e) {
			var r = t && typeof t.as == "string" ? t.as : "script", i = "link[rel=\"modulepreload\"][as=\"" + an(r) + "\"][href=\"" + an(e) + "\"]", a = i;
			switch (r) {
				case "audioworklet":
				case "paintworklet":
				case "serviceworker":
				case "sharedworker":
				case "worker":
				case "script": a = Rm(e);
			}
			if (!vm.has(a) && (e = D({
				rel: "modulepreload",
				href: e
			}, t), vm.set(a, e), n.querySelector(i) === null)) {
				switch (r) {
					case "audioworklet":
					case "paintworklet":
					case "serviceworker":
					case "sharedworker":
					case "worker":
					case "script": if (n.querySelector(zm(a))) return;
				}
				r = n.createElement("link"), np(r, "link", e), zt(r), n.head.appendChild(r);
			}
		}
	}
	function Am(e, t, n) {
		xm.S(e, t, n);
		var r = wm;
		if (r && e) {
			var i = Rt(r).hoistableStyles, a = Pm(e);
			t ||= "default";
			var o = i.get(a);
			if (!o) {
				var s = {
					loading: 0,
					preload: null
				};
				if (o = r.querySelector(Fm(a))) s.loading = 5;
				else {
					e = D({
						rel: "stylesheet",
						href: e,
						"data-precedence": t
					}, n), (n = vm.get(a)) && Hm(e, n);
					var c = o = r.createElement("link");
					zt(c), np(c, "link", e), c._p = new Promise(function(e, t) {
						c.onload = e, c.onerror = t;
					}), c.addEventListener("load", function() {
						s.loading |= 1;
					}), c.addEventListener("error", function() {
						s.loading |= 2;
					}), s.loading |= 4, Vm(o, t, r);
				}
				o = {
					type: "stylesheet",
					instance: o,
					count: 1,
					state: s
				}, i.set(a, o);
			}
		}
	}
	function jm(e, t) {
		xm.X(e, t);
		var n = wm;
		if (n && e) {
			var r = Rt(n).hoistableScripts, i = Rm(e), a = r.get(i);
			a || (a = n.querySelector(zm(i)), a || (e = D({
				src: e,
				async: !0
			}, t), (t = vm.get(i)) && Um(e, t), a = n.createElement("script"), zt(a), np(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function Mm(e, t) {
		xm.M(e, t);
		var n = wm;
		if (n && e) {
			var r = Rt(n).hoistableScripts, i = Rm(e), a = r.get(i);
			a || (a = n.querySelector(zm(i)), a || (e = D({
				src: e,
				async: !0,
				type: "module"
			}, t), (t = vm.get(i)) && Um(e, t), a = n.createElement("script"), zt(a), np(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function Nm(e, t, n, r) {
		var i = (i = Ee.current) ? bm(i) : null;
		if (!i) throw Error(s(446));
		switch (e) {
			case "meta":
			case "title": return null;
			case "style": return typeof n.precedence == "string" && typeof n.href == "string" ? (n = Pm(n.href), t = Rt(i).hoistableStyles, r = t.get(n), r || (r = {
				type: "style",
				instance: null,
				count: 0,
				state: null
			}, t.set(n, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			case "link":
				if (n.rel === "stylesheet" && typeof n.href == "string" && typeof n.precedence == "string") {
					e = Pm(n.href);
					var a = Rt(i).hoistableStyles, o = a.get(e);
					if (o || (i = i.ownerDocument || i, o = {
						type: "stylesheet",
						instance: null,
						count: 0,
						state: {
							loading: 0,
							preload: null
						}
					}, a.set(e, o), (a = i.querySelector(Fm(e))) ? a._p || (o.instance = a, o.state.loading = 5) : (a = vm.get(e), a || (a = {
						rel: "preload",
						as: "style",
						href: n.href,
						crossOrigin: n.crossOrigin,
						integrity: n.integrity,
						media: n.media,
						hrefLang: n.hrefLang,
						referrerPolicy: n.referrerPolicy
					}, vm.set(e, a)), Lm(i, e, a, o.state))), t && r === null) throw Error(s(528, ""));
					return o;
				}
				if (t && r !== null) throw Error(s(529, ""));
				return null;
			case "script": return t = n.async, n = n.src, typeof n == "string" && t && typeof t != "function" && typeof t != "symbol" ? (n = Rm(n), t = Rt(i).hoistableScripts, r = t.get(n), r || (r = {
				type: "script",
				instance: null,
				count: 0,
				state: null
			}, t.set(n, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			default: throw Error(s(444, e));
		}
	}
	function Pm(e) {
		return "href=\"" + an(e) + "\"";
	}
	function Fm(e) {
		return "link[rel=\"stylesheet\"][" + e + "]";
	}
	function Im(e) {
		return D({}, e, {
			"data-precedence": e.precedence,
			precedence: null
		});
	}
	function Lm(e, t, n, r) {
		if (t = e.querySelector("link[rel=\"preload\"][as=\"style\"][" + t + "]")) {
			if (!0 !== t[Nt]) {
				r.loading = 1;
				return;
			}
		} else t = e.createElement("link"), t[Nt] = !0, t.onload = t.onerror = Bt.bind(null, t), np(t, "link", n), zt(t), e.head.appendChild(t);
		r.preload = t, t.addEventListener("load", function() {
			return r.loading |= 1;
		}), t.addEventListener("error", function() {
			return r.loading |= 2;
		});
	}
	function Rm(e) {
		return "[src=\"" + an(e) + "\"]";
	}
	function zm(e) {
		return "script[async]" + e;
	}
	function Bm(e, t, n) {
		if (t.count++, t.instance === null) switch (t.type) {
			case "style":
				var r = e.querySelector("style[data-href~=\"" + an(n.href) + "\"]");
				if (r) return t.instance = r, zt(r), r;
				var i = D({}, n, {
					"data-href": n.href,
					"data-precedence": n.precedence,
					href: null,
					precedence: null
				});
				return r = (e.ownerDocument || e).createElement("style"), zt(r), np(r, "style", i), Vm(r, n.precedence, e), t.instance = r;
			case "stylesheet":
				i = Pm(n.href);
				var a = e.querySelector(Fm(i));
				if (a) return t.state.loading |= 4, t.instance = a, zt(a), a;
				r = Im(n), (i = vm.get(i)) && Hm(r, i), a = (e.ownerDocument || e).createElement("link"), zt(a);
				var o = a;
				return o._p = new Promise(function(e, t) {
					o.onload = e, o.onerror = t;
				}), np(a, "link", r), t.state.loading |= 4, Vm(a, n.precedence, e), t.instance = a;
			case "script": return a = Rm(n.src), (i = e.querySelector(zm(a))) ? (t.instance = i, zt(i), i) : (r = n, (i = vm.get(a)) && (r = D({}, n), Um(r, i)), e = e.ownerDocument || e, i = e.createElement("script"), zt(i), np(i, "link", r), e.head.appendChild(i), t.instance = i);
			case "void": return null;
			default: throw Error(s(443, t.type));
		}
		else t.type === "stylesheet" && !(t.state.loading & 4) && (r = t.instance, t.state.loading |= 4, Vm(r, n.precedence, e));
		return t.instance;
	}
	function Vm(e, t, n) {
		for (var r = n.querySelectorAll("link[rel=\"stylesheet\"][data-precedence],style[data-precedence]"), i = r.length ? r[r.length - 1] : null, a = i, o = 0; o < r.length; o++) {
			var s = r[o];
			if (s.dataset.precedence === t) a = s;
			else if (a !== i) break;
		}
		a ? a.parentNode.insertBefore(e, a.nextSibling) : (t = n.nodeType === 9 ? n.head : n, t.insertBefore(e, t.firstChild));
	}
	function Hm(e, t) {
		e.crossOrigin ??= t.crossOrigin, e.referrerPolicy ??= t.referrerPolicy, e.title ??= t.title;
	}
	function Um(e, t) {
		e.crossOrigin ??= t.crossOrigin, e.referrerPolicy ??= t.referrerPolicy, e.integrity ??= t.integrity;
	}
	var Wm = null;
	function Gm(e, t, n) {
		if (Wm === null) {
			var r = /* @__PURE__ */ new Map(), i = Wm = /* @__PURE__ */ new Map();
			i.set(n, r);
		} else i = Wm, r = i.get(n), r || (r = /* @__PURE__ */ new Map(), i.set(n, r));
		if (r.has(e)) return r;
		for (r.set(e, null), n = n.getElementsByTagName(e), i = 0; i < n.length; i++) {
			var a = n[i];
			if (!(a[Mt] || a[F] || e === "link" && a.getAttribute("rel") === "stylesheet") && a.namespaceURI !== "http://www.w3.org/2000/svg") {
				var o = a.getAttribute(t) || "";
				o = e + o;
				var s = r.get(o);
				s ? s.push(a) : r.set(o, [a]);
			}
		}
		return r;
	}
	function Km(e, t, n) {
		e = e.ownerDocument || e, e.head.insertBefore(n, t === "title" ? e.querySelector("head > title") : null);
	}
	function qm(e, t, n) {
		if (n === 1 || t.itemProp != null) return !1;
		switch (e) {
			case "meta":
			case "title": return !0;
			case "style":
				if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "") break;
				return !0;
			case "link":
				if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError) break;
				switch (t.rel) {
					case "stylesheet": return e = t.disabled, typeof t.precedence == "string" && e == null;
					default: return !0;
				}
			case "script": if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string") return !0;
		}
		return !1;
	}
	function Jm(e, t) {
		return e === "img" && t.src != null && t.src !== "" && t.onLoad == null && t.loading !== "lazy";
	}
	function Ym(e) {
		return !(e.type === "stylesheet" && !(e.state.loading & 3));
	}
	function Xm(e) {
		return (e.width || 100) * (e.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * .25;
	}
	function Zm(e, t) {
		typeof t.decode == "function" && (e.imgCount++, t.complete || (e.imgBytes += Xm(t), e.suspenseyImages.push(t)), e = rh.bind(e), t.decode().then(e, e));
	}
	function Qm(e, t, n, r) {
		if (n.type === "stylesheet" && (typeof r.media != "string" || !1 !== matchMedia(r.media).matches) && !(n.state.loading & 4)) {
			if (n.instance === null) {
				var i = Pm(r.href), a = t.querySelector(Fm(i));
				if (a) {
					t = a._p, typeof t == "object" && t && typeof t.then == "function" && (e.count++, e = nh.bind(e), t.then(e, e)), n.state.loading |= 4, n.instance = a, zt(a);
					return;
				}
				a = t.ownerDocument || t, r = Im(r), (i = vm.get(i)) && Hm(r, i), a = a.createElement("link"), zt(a);
				var o = a;
				o._p = new Promise(function(e, t) {
					o.onload = e, o.onerror = t;
				}), np(a, "link", r), n.instance = a;
			}
			e.stylesheets === null && (e.stylesheets = /* @__PURE__ */ new Map()), e.stylesheets.set(n, t), (t = n.state.preload) && !(n.state.loading & 3) && (e.count++, n = nh.bind(e), t.addEventListener("load", n), t.addEventListener("error", n));
		}
	}
	var $m = 0;
	function eh(e, t) {
		return e.stylesheets && e.count === 0 && ah(e, e.stylesheets), 0 < e.count || 0 < e.imgCount ? function(n) {
			var r = setTimeout(function() {
				if (e.stylesheets && ah(e, e.stylesheets), e.unsuspend) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, 6e4 + t);
			0 < e.imgBytes && $m === 0 && ($m = 62500 * op());
			var i = setTimeout(function() {
				if (e.waitingForImages = !1, e.count === 0 && (e.stylesheets && ah(e, e.stylesheets), e.unsuspend)) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, (e.imgBytes > $m ? 50 : 800) + t);
			return e.unsuspend = n, function() {
				e.unsuspend = null, clearTimeout(r), clearTimeout(i);
			};
		} : null;
	}
	function th(e) {
		if (e.count === 0 && (e.imgCount === 0 || !e.waitingForImages)) {
			if (e.stylesheets) ah(e, e.stylesheets);
			else if (e.unsuspend) {
				var t = e.unsuspend;
				e.unsuspend = null, t();
			}
		}
	}
	function nh() {
		this.count--, th(this);
	}
	function rh() {
		this.imgCount--, th(this);
	}
	var ih = null;
	function ah(e, t) {
		e.stylesheets = null, e.unsuspend !== null && (e.count++, ih = /* @__PURE__ */ new Map(), t.forEach(oh, e), ih = null, nh.call(e));
	}
	function oh(e, t) {
		if (!(t.state.loading & 4)) {
			var n = ih.get(e);
			if (n) var r = n.get(null);
			else {
				n = /* @__PURE__ */ new Map(), ih.set(e, n);
				for (var i = e.querySelectorAll("link[data-precedence],style[data-precedence]"), a = 0; a < i.length; a++) {
					var o = i[a];
					(o.nodeName === "LINK" || o.getAttribute("media") !== "not all") && (n.set(o.dataset.precedence, o), r = o);
				}
				r && n.set(null, r);
			}
			i = t.instance, o = i.getAttribute("data-precedence"), a = n.get(o) || r, a === r && n.set(null, i), n.set(o, i), this.count++, r = nh.bind(this), i.addEventListener("load", r), i.addEventListener("error", r), a ? a.parentNode.insertBefore(i, a.nextSibling) : (e = e.nodeType === 9 ? e.head : e, e.insertBefore(i, e.firstChild)), t.state.loading |= 4;
		}
	}
	var sh = {
		$$typeof: re,
		Provider: null,
		Consumer: null,
		_currentValue: ye,
		_currentValue2: ye,
		_threadCount: 0
	};
	function ch(e, t, n, r, i, a, o, s, c) {
		this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = ht(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = ht(0), this.hiddenUpdates = ht(null), this.identifierPrefix = r, this.onUncaughtError = i, this.onCaughtError = a, this.onRecoverableError = o, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = c, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
	}
	function lh(e, t, n, r, i, a, o, s, c, l, u, d) {
		return e = new ch(e, t, n, o, c, l, u, d, s), t = 1, !0 === a && (t |= 24), a = Mi(3, null, null, t), e.current = a, a.stateNode = e, t = Aa(), t.refCount++, e.pooledCache = t, t.refCount++, a.memoizedState = {
			element: r,
			isDehydrated: n,
			cache: t
		}, po(a), e;
	}
	function uh(e) {
		return e ? (e = Ai, e) : Ai;
	}
	function dh(e, t, n, r, i, a) {
		i = uh(i), r.context === null ? r.context = i : r.pendingContext = i, r = ho(t), r.payload = { element: n }, a = a === void 0 ? null : a, a !== null && (r.callback = a), n = go(e, r, t), n !== null && (Pd(n, e, t), _o(n, e, t));
	}
	function fh(e, t) {
		if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
			var n = e.retryLane;
			e.retryLane = n !== 0 && n < t ? n : t;
		}
	}
	function ph(e, t) {
		fh(e, t), (e = e.alternate) && fh(e, t);
	}
	function mh(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = Di(e, 67108864);
			t !== null && Pd(t, e, 67108864), ph(e, 67108864);
		}
	}
	function hh(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = jd();
			t = xt(t);
			var n = Di(e, t);
			n !== null && Pd(n, e, t), ph(e, t);
		}
	}
	var gh = !0;
	function _h(e, t, n, r) {
		var i = M.T;
		M.T = null;
		var a = N.p;
		try {
			N.p = 2, yh(e, t, n, r);
		} finally {
			N.p = a, M.T = i;
		}
	}
	function vh(e, t, n, r) {
		var i = M.T;
		M.T = null;
		var a = N.p;
		try {
			N.p = 8, yh(e, t, n, r);
		} finally {
			N.p = a, M.T = i;
		}
	}
	function yh(e, t, n, r) {
		if (gh) {
			var i = bh(r);
			if (i === null) Kf(e, t, r, xh, n), Mh(e, r);
			else if (Ph(i, e, t, n, r)) r.stopPropagation();
			else if (Mh(e, r), t & 4 && -1 < jh.indexOf(e)) {
				for (; i !== null;) {
					var a = It(i);
					if (a !== null) switch (a.tag) {
						case 3:
							if (a = a.stateNode, a.current.memoizedState.isDehydrated) {
								var o = lt(a.pendingLanes);
								if (o !== 0) {
									var s = a;
									for (s.pendingLanes |= 2, s.entangledLanes |= 2; o;) {
										var c = 1 << 31 - nt(o);
										s.entanglements[1] |= c, o &= ~c;
									}
									Ef(a), !(K & 6) && (gd = We() + 500, Df(0, !1));
								}
							}
							break;
						case 31:
						case 13: s = Di(a, 2), s !== null && Pd(s, a, 2), zd(), ph(a, 2);
					}
					if (a = bh(r), a === null && Kf(e, t, r, xh, n), a === i) break;
					i = a;
				}
				i !== null && r.stopPropagation();
			} else Kf(e, t, r, null, n);
		}
	}
	function bh(e) {
		return e = xn(e), Sh(e);
	}
	var xh = null;
	function Sh(e) {
		if (xh = null, e = Ft(e), e !== null) {
			var t = l(e);
			if (t === null) e = null;
			else {
				var n = t.tag;
				if (n === 13) {
					if (e = u(t), e !== null) return e;
					e = null;
				} else if (n === 31) {
					if (e = d(t), e !== null) return e;
					e = null;
				} else if (n === 3) {
					if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
					e = null;
				} else t !== e && (e = null);
			}
		}
		return xh = e, null;
	}
	function Ch(e) {
		switch (e) {
			case "beforetoggle":
			case "cancel":
			case "click":
			case "close":
			case "contextmenu":
			case "copy":
			case "cut":
			case "auxclick":
			case "dblclick":
			case "dragend":
			case "dragstart":
			case "drop":
			case "focusin":
			case "focusout":
			case "input":
			case "invalid":
			case "keydown":
			case "keypress":
			case "keyup":
			case "mousedown":
			case "mouseup":
			case "paste":
			case "pause":
			case "play":
			case "pointercancel":
			case "pointerdown":
			case "pointerup":
			case "ratechange":
			case "reset":
			case "seeked":
			case "submit":
			case "toggle":
			case "touchcancel":
			case "touchend":
			case "touchstart":
			case "volumechange":
			case "change":
			case "selectionchange":
			case "textInput":
			case "compositionstart":
			case "compositionend":
			case "compositionupdate":
			case "beforeblur":
			case "afterblur":
			case "beforeinput":
			case "blur":
			case "fullscreenchange":
			case "fullscreenerror":
			case "focus":
			case "hashchange":
			case "popstate":
			case "select":
			case "selectstart": return 2;
			case "drag":
			case "dragenter":
			case "dragexit":
			case "dragleave":
			case "dragover":
			case "mousemove":
			case "mouseout":
			case "mouseover":
			case "pointermove":
			case "pointerout":
			case "pointerover":
			case "resize":
			case "scroll":
			case "touchmove":
			case "wheel":
			case "mouseenter":
			case "mouseleave":
			case "pointerenter":
			case "pointerleave": return 8;
			case "message": switch (Ge()) {
				case Ke: return 2;
				case qe: return 8;
				case Je:
				case Ye: return 32;
				case Xe: return 268435456;
				default: return 32;
			}
			default: return 32;
		}
	}
	var wh = !1, Th = null, Eh = null, Dh = null, Oh = /* @__PURE__ */ new Map(), kh = /* @__PURE__ */ new Map(), Ah = [], jh = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");
	function Mh(e, t) {
		switch (e) {
			case "focusin":
			case "focusout":
				Th = null;
				break;
			case "dragenter":
			case "dragleave":
				Eh = null;
				break;
			case "mouseover":
			case "mouseout":
				Dh = null;
				break;
			case "pointerover":
			case "pointerout":
				Oh.delete(t.pointerId);
				break;
			case "gotpointercapture":
			case "lostpointercapture": kh.delete(t.pointerId);
		}
	}
	function Nh(e, t, n, r, i, a) {
		return e === null || e.nativeEvent !== a ? (e = {
			blockedOn: t,
			domEventName: n,
			eventSystemFlags: r,
			nativeEvent: a,
			targetContainers: [i]
		}, t !== null && (t = It(t), t !== null && mh(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
	}
	function Ph(e, t, n, r, i) {
		switch (t) {
			case "focusin": return Th = Nh(Th, e, t, n, r, i), !0;
			case "dragenter": return Eh = Nh(Eh, e, t, n, r, i), !0;
			case "mouseover": return Dh = Nh(Dh, e, t, n, r, i), !0;
			case "pointerover":
				var a = i.pointerId;
				return Oh.set(a, Nh(Oh.get(a) || null, e, t, n, r, i)), !0;
			case "gotpointercapture": return a = i.pointerId, kh.set(a, Nh(kh.get(a) || null, e, t, n, r, i)), !0;
		}
		return !1;
	}
	function Fh(e) {
		var t = Ft(e.target);
		if (t !== null) {
			var n = l(t);
			if (n !== null) {
				if (t = n.tag, t === 13) {
					if (t = u(n), t !== null) {
						e.blockedOn = t, wt(e.priority, function() {
							hh(n);
						});
						return;
					}
				} else if (t === 31) {
					if (t = d(n), t !== null) {
						e.blockedOn = t, wt(e.priority, function() {
							hh(n);
						});
						return;
					}
				} else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
					e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
					return;
				}
			}
		}
		e.blockedOn = null;
	}
	function Ih(e) {
		if (e.blockedOn !== null) return !1;
		for (var t = e.targetContainers; 0 < t.length;) {
			var n = bh(e.nativeEvent);
			if (n === null) {
				n = e.nativeEvent;
				var r = new n.constructor(n.type, n);
				bn = r, n.target.dispatchEvent(r), bn = null;
			} else return t = It(n), t !== null && mh(t), e.blockedOn = n, !1;
			t.shift();
		}
		return !0;
	}
	function Lh(e, t, n) {
		Ih(e) && n.delete(t);
	}
	function Rh() {
		wh = !1, Th !== null && Ih(Th) && (Th = null), Eh !== null && Ih(Eh) && (Eh = null), Dh !== null && Ih(Dh) && (Dh = null), Oh.forEach(Lh), kh.forEach(Lh);
	}
	function zh(e, t) {
		e.blockedOn === t && (e.blockedOn = null, wh || (wh = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, Rh)));
	}
	var Bh = null;
	function Vh(e) {
		Bh !== e && (Bh = e, n.unstable_scheduleCallback(n.unstable_NormalPriority, function() {
			Bh === e && (Bh = null);
			for (var t = 0; t < e.length; t += 3) {
				var n = e[t], r = e[t + 1], i = e[t + 2];
				if (typeof r != "function") {
					if (Sh(r || n) === null) continue;
					break;
				}
				var a = It(n);
				a !== null && (e.splice(t, 3), t -= 3, $s(a, {
					pending: !0,
					data: i,
					method: n.method,
					action: r
				}, r, i));
			}
		}));
	}
	function Hh(e) {
		function t(t) {
			return zh(t, e);
		}
		Th !== null && zh(Th, e), Eh !== null && zh(Eh, e), Dh !== null && zh(Dh, e), Oh.forEach(t), kh.forEach(t);
		for (var n = 0; n < Ah.length; n++) {
			var r = Ah[n];
			r.blockedOn === e && (r.blockedOn = null);
		}
		for (; 0 < Ah.length && (n = Ah[0], n.blockedOn === null);) Fh(n), n.blockedOn === null && Ah.shift();
		if (n = (e.ownerDocument || e).$$reactFormReplay, n != null) for (r = 0; r < n.length; r += 3) {
			var i = n[r], a = n[r + 1], o = i[Et] || null;
			if (typeof a == "function") o || Vh(n);
			else if (o) {
				var s = null;
				if (a && a.hasAttribute("formAction")) {
					if (i = a, o = a[Et] || null) s = o.formAction;
					else if (Sh(i) !== null) continue;
				} else s = o.action;
				typeof s == "function" ? n[r + 1] = s : (n.splice(r, 3), r -= 3), Vh(n);
			}
		}
	}
	function Uh() {
		function e(e) {
			e.canIntercept && e.info === "react-transition" && e.intercept({
				handler: function() {
					return new Promise(function(e) {
						return i = e;
					});
				},
				focusReset: "manual",
				scroll: "manual"
			});
		}
		function t() {
			i !== null && (i(), i = null), r || setTimeout(n, 20);
		}
		function n() {
			if (!r && !navigation.transition) {
				var e = navigation.currentEntry;
				e && e.url != null && navigation.navigate(e.url, {
					state: e.getState(),
					info: "react-transition",
					history: "replace"
				});
			}
		}
		if (typeof navigation == "object") {
			var r = !1, i = null;
			return navigation.addEventListener("navigate", e), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(n, 100), function() {
				r = !0, navigation.removeEventListener("navigate", e), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), i !== null && (i(), i = null);
			};
		}
	}
	function Wh(e) {
		this._internalRoot = e;
	}
	Gh.prototype.render = Wh.prototype.render = function(e) {
		var t = this._internalRoot;
		if (t === null) throw Error(s(409));
		var n = t.current;
		dh(n, jd(), e, t, null, null);
	}, Gh.prototype.unmount = Wh.prototype.unmount = function() {
		var e = this._internalRoot;
		if (e !== null) {
			this._internalRoot = null;
			var t = e.containerInfo;
			dh(e.current, 2, null, e, null, null), zd(), t[Dt] = null;
		}
	};
	function Gh(e) {
		this._internalRoot = e;
	}
	Gh.prototype.unstable_scheduleHydration = function(e) {
		if (e) {
			var t = Ct();
			e = {
				blockedOn: null,
				target: e,
				priority: t
			};
			for (var n = 0; n < Ah.length && t !== 0 && t < Ah[n].priority; n++);
			Ah.splice(n, 0, e), n === 0 && Fh(e);
		}
	};
	var Kh = i.version;
	if (Kh !== "19.3.1") throw Error(s(527, Kh, "19.3.1"));
	N.findDOMNode = function(e) {
		var t = e._reactInternals;
		if (t === void 0) throw typeof e.render == "function" ? Error(s(188)) : (e = Object.keys(e).join(","), Error(s(268, e)));
		return e = p(t), e = e === null ? null : m(e), e = e === null ? null : e.stateNode, e;
	};
	var qh = {
		bundleType: 0,
		version: "19.3.1",
		rendererPackageName: "react-dom",
		currentDispatcherRef: M,
		reconcilerVersion: "19.3.1"
	};
	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
		var Jh = __REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (!Jh.isDisabled && Jh.supportsFiber) try {
			$e = Jh.inject(qh), et = Jh;
		} catch {}
	}
	e.createRoot = function(e, t) {
		if (!c(e)) throw Error(s(299));
		var n = !1, r = "", i = Sc, a = Cc, o = wc;
		return t != null && (!0 === t.unstable_strictMode && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onUncaughtError !== void 0 && (i = t.onUncaughtError), t.onCaughtError !== void 0 && (a = t.onCaughtError), t.onRecoverableError !== void 0 && (o = t.onRecoverableError)), t = lh(e, 1, !1, null, null, n, r, null, i, a, o, Uh), e[Dt] = t.current, Wf(e), new Wh(t);
	};
})), s = /* @__PURE__ */ e(((e, t) => {
	function n() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE == "function") try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = o();
})), c = t(), l = s();
function u(e) {
	if (e === void 0) throw ReferenceError("this hasn't been initialised - super() hasn't been called");
	return e;
}
function d(e, t) {
	e.prototype = Object.create(t.prototype), e.prototype.constructor = e, e.__proto__ = t;
}
var f = {
	autoSleep: 120,
	force3D: "auto",
	nullTargetWarn: 1,
	units: { lineHeight: "" }
}, p = {
	duration: .5,
	overwrite: !1,
	delay: 0
}, m, h, g, _ = 1e8, v = 1 / _, y = Math.PI * 2, b = y / 4, x = 0, S = Math.sqrt, C = Math.cos, w = Math.sin, T = function(e) {
	return typeof e == "string";
}, E = function(e) {
	return typeof e == "function";
}, D = function(e) {
	return typeof e == "number";
}, O = function(e) {
	return e === void 0;
}, k = function(e) {
	return typeof e == "object";
}, A = function(e) {
	return e !== !1;
}, ee = function() {
	return typeof window < "u";
}, te = function(e) {
	return E(e) || T(e);
}, ne = typeof ArrayBuffer == "function" && ArrayBuffer.isView || function() {}, j = Array.isArray, re = /random\([^)]+\)/g, ie = /,\s*/g, ae = /(?:-?\.?\d|\.)+/gi, oe = /[-+=.]*\d+[.e\-+]*\d*[e\-+]*\d*/g, se = /[-+=.]*\d+[.e-]*\d*[a-z%]*/g, ce = /[-+=.]*\d+\.?\d*(?:e-|e\+)?\d*/gi, le = /[+-]=-?[.\d]+/, ue = /[^,'"\[\]\s]+/gi, de = /^[+\-=e\s\d]*\d+[.\d]*([a-z]*|%)\s*$/i, fe, pe, me, he, ge = {}, _e = {}, ve, M = function(e) {
	return (_e = Je(e, ge)) && ur;
}, N = function(e, t) {
	return console.warn("Invalid property", e, "set to", t, "Missing plugin? gsap.registerPlugin()");
}, ye = function(e, t) {
	return !t && console.warn(e);
}, be = function(e, t) {
	return e && (ge[e] = t) && _e && (_e[e] = t) || ge;
}, xe = function() {
	return 0;
}, Se = {
	suppressEvents: !0,
	isStart: !0,
	kill: !1
}, Ce = {
	suppressEvents: !0,
	kill: !1
}, P = { suppressEvents: !0 }, we = {}, Te = [], Ee = {}, De, Oe = {}, ke = {}, Ae = 30, je = [], Me = "", Ne = function(e) {
	var t = e[0], n, r;
	if (k(t) || E(t) || (e = [e]), !(n = (t._gsap || {}).harness)) {
		for (r = je.length; r-- && !je[r].targetTest(t););
		n = je[r];
	}
	for (r = e.length; r--;) e[r] && (e[r]._gsap || (e[r]._gsap = new bn(e[r], n))) || e.splice(r, 1);
	return e;
}, Pe = function(e) {
	return e._gsap || Ne(At(e))[0]._gsap;
}, Fe = function(e, t, n) {
	return (n = e[t]) && E(n) ? e[t]() : O(n) && e.getAttribute && e.getAttribute(t) || n;
}, Ie = function(e, t) {
	return (e = e.split(",")).forEach(t) || e;
}, Le = function(e) {
	return Math.round(e * 1e5) / 1e5 || 0;
}, Re = function(e) {
	return Math.round(e * 1e7) / 1e7 || 0;
}, ze = function(e, t) {
	var n = t.charAt(0), r = parseFloat(t.substr(2));
	return e = parseFloat(e), n === "+" ? e + r : n === "-" ? e - r : n === "*" ? e * r : e / r;
}, Be = function(e, t) {
	for (var n = t.length, r = 0; e.indexOf(t[r]) < 0 && ++r < n;);
	return r < n;
}, Ve = function() {
	var e = Te.length, t = Te.slice(0), n, r;
	for (Ee = {}, Te.length = 0, n = 0; n < e; n++) r = t[n], r && r._lazy && (r.render(r._lazy[0], r._lazy[1], !0)._lazy = 0);
}, He = function(e) {
	return !!(e._initted || e._startAt || e.add);
}, Ue = function(e, t, n, r) {
	Te.length && !h && Ve(), e.render(t, n, r || !!(h && t < 0 && He(e))), Te.length && !h && Ve();
}, We = function(e) {
	var t = parseFloat(e);
	return (t || t === 0) && (e + "").match(ue).length < 2 ? t : T(e) ? e.trim() : e;
}, Ge = function(e) {
	return e;
}, Ke = function(e, t) {
	for (var n in t) n in e || (e[n] = t[n]);
	return e;
}, qe = function(e) {
	return function(t, n) {
		for (var r in n) r in t || r === "duration" && e || r === "ease" || (t[r] = n[r]);
	};
}, Je = function(e, t) {
	for (var n in t) e[n] = t[n];
	return e;
}, Ye = function e(t, n) {
	for (var r in n) r !== "__proto__" && r !== "constructor" && r !== "prototype" && (t[r] = k(n[r]) ? e(t[r] || (t[r] = {}), n[r]) : n[r]);
	return t;
}, Xe = function(e, t) {
	var n = {}, r;
	for (r in e) r in t || (n[r] = e[r]);
	return n;
}, Ze = function(e) {
	var t = e.parent || fe, n = e.keyframes ? qe(j(e.keyframes)) : Ke;
	if (A(e.inherit)) for (; t;) n(e, t.vars.defaults), t = t.parent || t._dp;
	return e;
}, Qe = function(e, t) {
	for (var n = e.length, r = n === t.length; r && n-- && e[n] === t[n];);
	return n < 0;
}, $e = function(e, t, n, r, i) {
	n === void 0 && (n = "_first"), r === void 0 && (r = "_last");
	var a = e[r], o;
	if (i) for (o = t[i]; a && a[i] > o;) a = a._prev;
	return a ? (t._next = a._next, a._next = t) : (t._next = e[n], e[n] = t), t._next ? t._next._prev = t : e[r] = t, t._prev = a, t.parent = t._dp = e, t;
}, et = function(e, t, n, r) {
	n === void 0 && (n = "_first"), r === void 0 && (r = "_last");
	var i = t._prev, a = t._next;
	i ? i._next = a : e[n] === t && (e[n] = a), a ? a._prev = i : e[r] === t && (e[r] = i), t._next = t._prev = t.parent = null;
}, tt = function(e, t) {
	e.parent && (!t || e.parent.autoRemoveChildren) && e.parent.remove && e.parent.remove(e), e._act = 0;
}, nt = function(e, t) {
	if (e && (!t || t._end > e._dur || t._start < 0)) for (var n = e; n;) n._dirty = 1, n = n.parent;
	return e;
}, rt = function(e) {
	for (var t = e.parent; t && t.parent;) t._dirty = 1, t.totalDuration(), t = t.parent;
	return e;
}, it = function(e, t, n, r) {
	return e._startAt && (h ? e._startAt.revert(Ce) : e.vars.immediateRender && !e.vars.autoRevert || e._startAt.render(t, !0, r));
}, at = function e(t) {
	return !t || t._ts && e(t.parent);
}, ot = function(e) {
	return e._repeat ? st(e._tTime, e = e.duration() + e._rDelay) * e : 0;
}, st = function(e, t) {
	var n = Math.floor(e = Re(e / t));
	return e && n === e ? n - 1 : n;
}, ct = function(e, t) {
	return (e - t._start) * t._ts + (t._ts >= 0 ? 0 : t._dirty ? t.totalDuration() : t._tDur);
}, lt = function(e) {
	return e._end = Re(e._start + (e._tDur / Math.abs(e._ts || e._rts || v) || 0));
}, ut = function(e, t) {
	var n = e._dp;
	return n && n.smoothChildTiming && e._ts && (e._start = Re(n._time - (e._ts > 0 ? t / e._ts : ((e._dirty ? e.totalDuration() : e._tDur) - t) / -e._ts)), lt(e), n._dirty || nt(n, e)), e;
}, dt = function(e, t) {
	var n;
	if ((t._time || !t._dur && t._initted || t._start < e._time && (t._dur || !t.add)) && (n = ct(e.rawTime(), t), (!t._dur || Tt(0, t.totalDuration(), n) - t._tTime > v) && t.render(n, !0)), nt(e, t)._dp && e._initted && e._time >= e._dur && e._ts) {
		if (e._dur < e.duration()) for (n = e; n._dp;) n.rawTime() >= 0 && n.totalTime(n._tTime), n = n._dp;
		e._zTime = -v;
	}
}, ft = function(e, t, n, r) {
	return t.parent && tt(t), t._start = Re((D(n) ? n : n || e !== fe ? St(e, n, t) : e._time) + t._delay), t._end = Re(t._start + (t.totalDuration() / Math.abs(t.timeScale()) || 0)), $e(e, t, "_first", "_last", e._sort ? "_start" : 0), gt(t) || (e._recent = t), r || dt(e, t), e._ts < 0 && ut(e, e._tTime), e;
}, pt = function(e, t) {
	return (ge.ScrollTrigger || N("scrollTrigger", t)) && ge.ScrollTrigger.create(t, e);
}, mt = function(e, t, n, r, i) {
	if (kn(e, t, i), !e._initted) return 1;
	if (!n && e._pt && !h && (e._dur && e.vars.lazy !== !1 || !e._dur && e.vars.lazy) && De !== sn.frame) return Te.push(e), e._lazy = [i, r], 1;
}, ht = function e(t) {
	var n = t.parent;
	return n && n._ts && n._initted && !n._lock && (n.rawTime() < 0 || e(n));
}, gt = function(e) {
	var t = e.data;
	return t === "isFromStart" || t === "isStart";
}, _t = function(e, t, n, r) {
	var i = e.ratio, a = t < 0 || !t && (!e._start && ht(e) && (e._initted || !gt(e)) || (e._ts < 0 || e._dp._ts < 0) && !gt(e)) ? 0 : 1, o = e._rDelay, s = 0, c, l, u;
	if (o && e._repeat && (s = Tt(0, e._tDur, t), l = st(s, o), e._yoyo && l & 1 && (a = 1 - a), l !== st(e._tTime, o) && (i = 1 - a, e.vars.repeatRefresh && e._initted && e.invalidate())), a !== i || h || r || e._zTime === v || !t && e._zTime) {
		if (!e._initted && mt(e, t, r, n, s)) return;
		for (u = e._zTime, e._zTime = t || (n ? v : 0), n ||= t && !u, e.ratio = a, e._from && (a = 1 - a), e._time = 0, e._tTime = s, c = e._pt; c;) c.r(a, c.d), c = c._next;
		t < 0 && it(e, t, n, !0), e._onUpdate && !n && qt(e, "onUpdate"), s && e._repeat && !n && e.parent && qt(e, "onRepeat"), (t >= e._tDur || t < 0) && e.ratio === a && (a && tt(e, 1), !n && !h && (qt(e, a ? "onComplete" : "onReverseComplete", !0), e._prom && e._prom()));
	} else e._zTime ||= t;
}, vt = function(e, t, n) {
	var r;
	if (n > t) for (r = e._first; r && r._start <= n;) {
		if (r.data === "isPause" && r._start > t) return r;
		r = r._next;
	}
	else for (r = e._last; r && r._start >= n;) {
		if (r.data === "isPause" && r._start < t) return r;
		r = r._prev;
	}
}, yt = function(e, t, n, r) {
	var i = e._repeat, a = Re(t) || 0, o = e._tTime / e._tDur;
	return o && !r && (e._time *= a / e._dur), e._dur = a, e._tDur = i ? i < 0 ? 1e10 : Re(a * (i + 1) + e._rDelay * i) : a, o > 0 && !r && ut(e, e._tTime = e._tDur * o), e.parent && lt(e), n || nt(e.parent, e), e;
}, bt = function(e) {
	return e instanceof Sn ? nt(e) : yt(e, e._dur);
}, xt = {
	_start: 0,
	endTime: xe,
	totalDuration: xe
}, St = function e(t, n, r) {
	var i = t.labels, a = t._recent || xt, o = t.duration() >= _ ? a.endTime(!1) : t._dur, s, c, l;
	return T(n) && (isNaN(n) || n in i) ? (c = n.charAt(0), l = n.substr(-1) === "%", s = n.indexOf("="), c === "<" || c === ">" ? (s >= 0 && (n = n.replace(/=/, "")), (c === "<" ? a._start : a.endTime(a._repeat >= 0)) + (parseFloat(n.substr(1)) || 0) * (l ? (s < 0 ? a : r).totalDuration() / 100 : 1)) : s < 0 ? (n in i || (i[n] = o), i[n]) : (c = parseFloat(n.charAt(s - 1) + n.substr(s + 1)), l && r && (c = c / 100 * (j(r) ? r[0] : r).totalDuration()), s > 1 ? e(t, n.substr(0, s - 1), r) + c : o + c)) : n == null ? o : +n;
}, Ct = function(e, t, n) {
	var r = D(t[1]), i = (r ? 2 : 1) + (e < 2 ? 0 : 1), a = t[i], o, s;
	if (r && (a.duration = t[1]), a.parent = n, e) {
		for (o = a, s = n; s && !("immediateRender" in o);) o = s.vars.defaults || {}, s = A(s.vars.inherit) && s.parent;
		a.immediateRender = A(o.immediateRender), e < 2 ? a.runBackwards = 1 : a.startAt = t[i - 1];
	}
	return new In(t[0], a, t[i + 1]);
}, wt = function(e, t) {
	return e || e === 0 ? t(e) : t;
}, Tt = function(e, t, n) {
	return n < e ? e : n > t ? t : n;
}, F = function(e, t) {
	return !T(e) || !(t = de.exec(e)) ? "" : t[1];
}, Et = function(e, t, n) {
	return wt(n, function(n) {
		return Tt(e, t, n);
	});
}, Dt = [].slice, Ot = function(e, t) {
	return e && k(e) && "length" in e && (!t && !e.length || e.length - 1 in e && k(e[0])) && !e.nodeType && e !== pe;
}, kt = function(e, t, n) {
	return n === void 0 && (n = []), e.forEach(function(e) {
		var r;
		return T(e) && !t || Ot(e, 1) ? (r = n).push.apply(r, At(e)) : n.push(e);
	}) || n;
}, At = function(e, t, n) {
	return g && !t && g.selector ? g.selector(e) : T(e) && !n && (me || !cn()) ? Dt.call((t || he).querySelectorAll(e), 0) : j(e) ? kt(e, n) : Ot(e) ? Dt.call(e, 0) : e ? [e] : [];
}, jt = function(e) {
	return e = At(e)[0] || ye("Invalid scope") || {}, function(t) {
		var n = e.current || e.nativeElement || e;
		return At(t, n.querySelectorAll ? n : n === e ? ye("Invalid scope") || he.createElement("div") : e);
	};
}, Mt = function(e) {
	return e.sort(function() {
		return .5 - Math.random();
	});
}, Nt = function(e) {
	if (E(e)) return e;
	var t = k(e) ? e : { each: e }, n = hn(t.ease), r = t.from || 0, i = parseFloat(t.base) || 0, a = {}, o = r > 0 && r < 1, s = isNaN(r) || o, c = t.axis, l = r, u = r;
	return T(r) ? l = u = {
		center: .5,
		edges: .5,
		end: 1
	}[r] || 0 : !o && s && (l = r[0], u = r[1]), function(e, o, d) {
		var f = (d || t).length, p = a[f], m, h, g, v, y, b, x, C, w;
		if (!p) {
			if (w = t.grid === "auto" ? 0 : (t.grid || [1, _])[1], !w) {
				for (x = -_; x < (x = d[w++].getBoundingClientRect().left) && w < f;);
				w < f && w--;
			}
			for (p = a[f] = [], m = s ? Math.min(w, f) * l - .5 : r % w, h = w === _ ? 0 : s ? f * u / w - .5 : r / w | 0, x = 0, C = _, b = 0; b < f; b++) g = b % w - m, v = h - (b / w | 0), p[b] = y = c ? Math.abs(c === "y" ? v : g) : S(g * g + v * v), y > x && (x = y), y < C && (C = y);
			r === "random" && Mt(p), p.max = x - C, p.min = C, p.v = f = (parseFloat(t.amount) || parseFloat(t.each) * (w > f ? f - 1 : c ? c === "y" ? f / w : w : Math.max(w, f / w)) || 0) * (r === "edges" ? -1 : 1), p.b = f < 0 ? i - f : i, p.u = F(t.amount || t.each) || 0, n = n && f < 0 ? mn(n) : n;
		}
		return f = (p[e] - p.min) / p.max || 0, Re(p.b + (n ? n(f) : f) * p.v) + p.u;
	};
}, Pt = function(e) {
	var t = 10 ** ((e + "").split(".")[1] || "").length;
	return function(n) {
		var r = Re(Math.round(parseFloat(n) / e) * e * t);
		return (r - r % 1) / t + (D(n) ? 0 : F(n));
	};
}, Ft = function(e, t) {
	var n = j(e), r, i;
	return !n && k(e) && (r = n = e.radius || _, e.values ? (e = At(e.values), (i = !D(e[0])) && (r *= r)) : e = Pt(e.increment)), wt(t, n ? E(e) ? function(t) {
		return i = e(t), Math.abs(i - t) <= r ? i : t;
	} : function(t) {
		for (var n = parseFloat(i ? t.x : t), a = parseFloat(i ? t.y : 0), o = _, s = 0, c = e.length, l, u; c--;) i ? (l = e[c].x - n, u = e[c].y - a, l = l * l + u * u) : l = Math.abs(e[c] - n), l < o && (o = l, s = c);
		return s = !r || o <= r ? e[s] : t, i || s === t || D(t) ? s : s + F(t);
	} : Pt(e));
}, It = function(e, t, n, r) {
	return wt(j(e) ? !t : n === !0 ? !!(n = 0) : !r, function() {
		return j(e) ? e[~~(Math.random() * e.length)] : (n ||= 1e-5) && (r = n < 1 ? 10 ** ((n + "").length - 2) : 1) && Math.floor(Math.round((e - n / 2 + Math.random() * (t - e + n * .99)) / n) * n * r) / r;
	});
}, Lt = function() {
	var e = [...arguments];
	return function(t) {
		return e.reduce(function(e, t) {
			return t(e);
		}, t);
	};
}, Rt = function(e, t) {
	return function(n) {
		return e(parseFloat(n)) + (t || F(n));
	};
}, zt = function(e, t, n) {
	return Wt(e, t, 0, 1, n);
}, Bt = function(e, t, n) {
	return wt(n, function(n) {
		return e[~~t(n)];
	});
}, Vt = function e(t, n, r) {
	var i = n - t;
	return j(t) ? Bt(t, e(0, t.length), n) : wt(r, function(e) {
		return (i + (e - t) % i) % i + t;
	});
}, Ht = function e(t, n, r) {
	var i = n - t, a = i * 2;
	return j(t) ? Bt(t, e(0, t.length - 1), n) : wt(r, function(e) {
		return e = (a + (e - t) % a) % a || 0, t + (e > i ? a - e : e);
	});
}, Ut = function(e) {
	return e.replace(re, function(e) {
		var t = e.indexOf("[") + 1, n = e.substring(t || 7, t ? e.indexOf("]") : e.length - 1).split(ie);
		return It(t ? n : +n[0], t ? 0 : +n[1], +n[2] || 1e-5);
	});
}, Wt = function(e, t, n, r, i) {
	var a = t - e, o = r - n;
	return wt(i, function(t) {
		return n + ((t - e) / a * o || 0);
	});
}, Gt = function e(t, n, r, i) {
	var a = isNaN(t + n) ? 0 : function(e) {
		return (1 - e) * t + e * n;
	};
	if (!a) {
		var o = T(t), s = {}, c, l, u, d, f;
		if (r === !0 && (i = 1) && (r = null), o) t = { p: t }, n = { p: n };
		else if (j(t) && !j(n)) {
			for (u = [], d = t.length, f = d - 2, l = 1; l < d; l++) u.push(e(t[l - 1], t[l]));
			d--, a = function(e) {
				e *= d;
				var t = Math.min(f, ~~e);
				return u[t](e - t);
			}, r = n;
		} else i || (t = Je(j(t) ? [] : {}, t));
		if (!u) {
			for (c in n) wn.call(s, t, c, "get", n[c]);
			a = function(e) {
				return Gn(e, s) || (o ? t.p : t);
			};
		}
	}
	return wt(r, a);
}, Kt = function(e, t, n) {
	var r = e.labels, i = _, a, o, s;
	for (a in r) o = r[a] - t, o < 0 == !!n && o && i > (o = Math.abs(o)) && (s = a, i = o);
	return s;
}, qt = function(e, t, n) {
	var r = e.vars, i = r[t], a = g, o = e._ctx, s, c, l;
	if (i) return s = r[t + "Params"], c = r.callbackScope || e, n && Te.length && Ve(), o && (g = o), l = s ? i.apply(c, s) : i.call(c), g = a, l;
}, Jt = function(e) {
	return tt(e), e.scrollTrigger && e.scrollTrigger.kill(!!h), e.progress() < 1 && qt(e, "onInterrupt"), e;
}, I, Yt = [], Xt = function(e) {
	if (e) {
		if (e = !e.name && e.default || e, ee() || e.headless) {
			var t = e.name, n = E(e), r = t && !n && e.init ? function() {
				this._props = [];
			} : e, i = {
				init: xe,
				render: Gn,
				add: wn,
				kill: qn,
				modifier: Kn,
				rawVars: 0
			}, a = {
				targetTest: 0,
				get: 0,
				getSetter: Vn,
				aliases: {},
				register: 0
			};
			if (cn(), e !== r) {
				if (Oe[t]) return;
				Ke(r, Ke(Xe(e, i), a)), Je(r.prototype, Je(i, Xe(e, a))), Oe[r.prop = t] = r, e.targetTest && (je.push(r), we[t] = 1), t = (t === "css" ? "CSS" : t.charAt(0).toUpperCase() + t.substr(1)) + "Plugin";
			}
			be(t, r), e.register && e.register(ur, r, Xn);
		} else Yt.push(e);
	}
}, L = 255, Zt = {
	aqua: [
		0,
		L,
		L
	],
	lime: [
		0,
		L,
		0
	],
	silver: [
		192,
		192,
		192
	],
	black: [
		0,
		0,
		0
	],
	maroon: [
		128,
		0,
		0
	],
	teal: [
		0,
		128,
		128
	],
	blue: [
		0,
		0,
		L
	],
	navy: [
		0,
		0,
		128
	],
	white: [
		L,
		L,
		L
	],
	olive: [
		128,
		128,
		0
	],
	yellow: [
		L,
		L,
		0
	],
	orange: [
		L,
		165,
		0
	],
	gray: [
		128,
		128,
		128
	],
	purple: [
		128,
		0,
		128
	],
	green: [
		0,
		128,
		0
	],
	red: [
		L,
		0,
		0
	],
	pink: [
		L,
		192,
		203
	],
	cyan: [
		0,
		L,
		L
	],
	transparent: [
		L,
		L,
		L,
		0
	]
}, Qt = function(e, t, n) {
	return e += e < 0 ? 1 : e > 1 ? -1 : 0, (e * 6 < 1 ? t + (n - t) * e * 6 : e < .5 ? n : e * 3 < 2 ? t + (n - t) * (2 / 3 - e) * 6 : t) * L + .5 | 0;
}, $t = function(e, t, n) {
	var r = e ? D(e) ? [
		e >> 16,
		e >> 8 & L,
		e & L
	] : 0 : Zt.black, i, a, o, s, c, l, u, d, f, p;
	if (!r) {
		if (e.substr(-1) === "," && (e = e.substr(0, e.length - 1)), Zt[e]) r = Zt[e];
		else if (e.charAt(0) === "#") {
			if (e.length < 6 && (i = e.charAt(1), a = e.charAt(2), o = e.charAt(3), e = "#" + i + i + a + a + o + o + (e.length === 5 ? e.charAt(4) + e.charAt(4) : "")), e.length === 9) return r = parseInt(e.substr(1, 6), 16), [
				r >> 16,
				r >> 8 & L,
				r & L,
				parseInt(e.substr(7), 16) / 255
			];
			e = parseInt(e.substr(1), 16), r = [
				e >> 16,
				e >> 8 & L,
				e & L
			];
		} else if (e.substr(0, 3) === "hsl") {
			if (r = p = e.match(ae), !t) s = r[0] % 360 / 360, c = r[1] / 100, l = r[2] / 100, a = l <= .5 ? l * (c + 1) : l + c - l * c, i = l * 2 - a, r.length > 3 && (r[3] *= 1), r[0] = Qt(s + 1 / 3, i, a), r[1] = Qt(s, i, a), r[2] = Qt(s - 1 / 3, i, a);
			else if (~e.indexOf("=")) return r = e.match(oe), n && r.length < 4 && (r[3] = 1), r;
		} else r = e.match(ae) || Zt.transparent;
		r = r.map(Number);
	}
	return t && !p && (i = r[0] / L, a = r[1] / L, o = r[2] / L, u = Math.max(i, a, o), d = Math.min(i, a, o), l = (u + d) / 2, u === d ? s = c = 0 : (f = u - d, c = l > .5 ? f / (2 - u - d) : f / (u + d), s = u === i ? (a - o) / f + (a < o ? 6 : 0) : u === a ? (o - i) / f + 2 : (i - a) / f + 4, s *= 60), r[0] = ~~(s + .5), r[1] = ~~(c * 100 + .5), r[2] = ~~(l * 100 + .5)), n && r.length < 4 && (r[3] = 1), r;
}, en = function(e) {
	var t = [], n = [], r = -1;
	return e.split(nn).forEach(function(e) {
		var i = e.match(se) || [];
		t.push.apply(t, i), n.push(r += i.length + 1);
	}), t.c = n, t;
}, tn = function(e, t, n) {
	var r = "", i = (e + r).match(nn), a = t ? "hsla(" : "rgba(", o = 0, s, c, l, u;
	if (!i) return e;
	if (i = i.map(function(e) {
		return (e = $t(e, t, 1)) && a + (t ? e[0] + "," + e[1] + "%," + e[2] + "%," + e[3] : e.join(",")) + ")";
	}), n && (l = en(e), s = n.c, s.join(r) !== l.c.join(r))) for (c = e.replace(nn, "1").split(se), u = c.length - 1; o < u; o++) r += c[o] + (~s.indexOf(o) ? i.shift() || a + "0,0,0,0)" : (l.length ? l : i.length ? i : n).shift());
	if (!c) for (c = e.split(nn), u = c.length - 1; o < u; o++) r += c[o] + i[o];
	return r + c[u];
}, nn = function() {
	var e = "(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3,4}){1,2}\\b", t;
	for (t in Zt) e += "|" + t + "\\b";
	return RegExp(e + ")", "gi");
}(), rn = /hsl[a]?\(/, an = function(e) {
	var t = e.join(" "), n;
	if (nn.lastIndex = 0, nn.test(t)) return n = rn.test(t), e[1] = tn(e[1], n), e[0] = tn(e[0], n, en(e[1])), !0;
}, on, sn = function() {
	var e = Date.now, t = 500, n = 33, r = e(), i = r, a = 1e3 / 240, o = a, s = [], c, l, u, d, f, p, m = function u(m) {
		var h = e() - i, g = m === !0, _, v, y, b;
		if ((h > t || h < 0) && (r += h - n), i += h, y = i - r, _ = y - o, (_ > 0 || g) && (b = ++d.frame, f = y - d.time * 1e3, d.time = y /= 1e3, o += _ + (_ >= a ? 4 : a - _), v = 1), g || (c = l(u)), v) for (p = 0; p < s.length; p++) s[p](y, f, b, m);
	};
	return d = {
		time: 0,
		frame: 0,
		tick: function() {
			m(!0);
		},
		deltaRatio: function(e) {
			return f / (1e3 / (e || 60));
		},
		wake: function() {
			ve && (!me && ee() && (pe = me = window, he = pe.document || {}, ge.gsap = ur, (pe.gsapVersions || (pe.gsapVersions = [])).push(ur.version), M(_e || pe.GreenSockGlobals || !pe.gsap && pe || {}), Yt.forEach(Xt)), u = typeof requestAnimationFrame < "u" && requestAnimationFrame, c && d.sleep(), l = u || function(e) {
				return setTimeout(e, o - d.time * 1e3 + 1 | 0);
			}, on = 1, m(2));
		},
		sleep: function() {
			(u ? cancelAnimationFrame : clearTimeout)(c), on = 0, l = xe;
		},
		lagSmoothing: function(e, r) {
			t = e || Infinity, n = Math.min(r || 33, t);
		},
		fps: function(e) {
			a = 1e3 / (e || 240), o = d.time * 1e3 + a;
		},
		add: function(e, t, n) {
			var r = t ? function(t, n, i, a) {
				e(t, n, i, a), d.remove(r);
			} : e;
			return d.remove(e), s[n ? "unshift" : "push"](r), cn(), r;
		},
		remove: function(e, t) {
			~(t = s.indexOf(e)) && s.splice(t, 1) && p >= t && p--;
		},
		_listeners: s
	}, d;
}(), cn = function() {
	return !on && sn.wake();
}, R = {}, ln = /^[\d.\-M][\d.\-,\s]/, un = /["']/g, dn = function(e) {
	for (var t = {}, n = e.substr(1, e.length - 3).split(":"), r = n[0], i = 1, a = n.length, o, s, c; i < a; i++) s = n[i], o = i === a - 1 ? s.length : s.lastIndexOf(","), c = s.substr(0, o), t[r] = isNaN(c) ? c.replace(un, "").trim() : +c, r = s.substr(o + 1).trim();
	return t;
}, fn = function(e) {
	var t = e.indexOf("(") + 1, n = e.indexOf(")"), r = e.indexOf("(", t);
	return e.substring(t, ~r && r < n ? e.indexOf(")", n + 1) : n);
}, pn = function(e) {
	var t = (e + "").split("("), n = R[t[0]];
	return n && t.length > 1 && n.config ? n.config.apply(null, ~e.indexOf("{") ? [dn(t[1])] : fn(e).split(",").map(We)) : R._CE && ln.test(e) ? R._CE("", e) : n;
}, mn = function(e) {
	return function(t) {
		return 1 - e(1 - t);
	};
}, hn = function(e, t) {
	return e && (E(e) ? e : R[e] || pn(e)) || t;
}, gn = function(e, t, n, r) {
	n === void 0 && (n = function(e) {
		return 1 - t(1 - e);
	}), r === void 0 && (r = function(e) {
		return e < .5 ? t(e * 2) / 2 : 1 - t((1 - e) * 2) / 2;
	});
	var i = {
		easeIn: t,
		easeOut: n,
		easeInOut: r
	}, a;
	return Ie(e, function(e) {
		for (var t in R[e] = ge[e] = i, R[a = e.toLowerCase()] = n, i) R[a + (t === "easeIn" ? ".in" : t === "easeOut" ? ".out" : ".inOut")] = R[e + "." + t] = i[t];
	}), i;
}, _n = function(e) {
	return function(t) {
		return t < .5 ? (1 - e(1 - t * 2)) / 2 : .5 + e((t - .5) * 2) / 2;
	};
}, vn = function e(t, n, r) {
	var i = n >= 1 ? n : 1, a = (r || (t ? .3 : .45)) / (n < 1 ? n : 1), o = a / y * (Math.asin(1 / i) || 0), s = function(e) {
		return e === 1 ? 1 : i * 2 ** (-10 * e) * w((e - o) * a) + 1;
	}, c = t === "out" ? s : t === "in" ? function(e) {
		return 1 - s(1 - e);
	} : _n(s);
	return a = y / a, c.config = function(n, r) {
		return e(t, n, r);
	}, c;
}, yn = function e(t, n) {
	n === void 0 && (n = 1.70158);
	var r = function(e) {
		return e ? --e * e * ((n + 1) * e + n) + 1 : 0;
	}, i = t === "out" ? r : t === "in" ? function(e) {
		return 1 - r(1 - e);
	} : _n(r);
	return i.config = function(n) {
		return e(t, n);
	}, i;
};
Ie("Linear,Quad,Cubic,Quart,Quint,Strong", function(e, t) {
	var n = t < 5 ? t + 1 : t;
	gn(e + ",Power" + (n - 1), t ? function(e) {
		return e ** +n;
	} : function(e) {
		return e;
	}, function(e) {
		return 1 - (1 - e) ** n;
	}, function(e) {
		return e < .5 ? (e * 2) ** n / 2 : 1 - ((1 - e) * 2) ** n / 2;
	});
}), R.Linear.easeNone = R.none = R.Linear.easeIn, gn("Elastic", vn("in"), vn("out"), vn()), (function(e, t) {
	var n = 1 / t, r = 2 * n, i = 2.5 * n, a = function(a) {
		return a < n ? e * a * a : a < r ? e * (a - 1.5 / t) ** 2 + .75 : a < i ? e * (a -= 2.25 / t) * a + .9375 : e * (a - 2.625 / t) ** 2 + .984375;
	};
	gn("Bounce", function(e) {
		return 1 - a(1 - e);
	}, a);
})(7.5625, 2.75), gn("Expo", function(e) {
	return 2 ** (10 * (e - 1)) * e + e * e * e * e * e * e * (1 - e);
}), gn("Circ", function(e) {
	return -(S(1 - e * e) - 1);
}), gn("Sine", function(e) {
	return e === 1 ? 1 : -C(e * b) + 1;
}), gn("Back", yn("in"), yn("out"), yn()), R.SteppedEase = R.steps = ge.SteppedEase = { config: function(e, t) {
	e === void 0 && (e = 1);
	var n = 1 / e, r = e + +!t, i = +!!t, a = 1 - v;
	return function(e) {
		return ((r * Tt(0, a, e) | 0) + i) * n;
	};
} }, p.ease = R["quad.out"], Ie("onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt", function(e) {
	return Me += e + "," + e + "Params,";
});
var bn = function(e, t) {
	this.id = x++, e._gsap = this, this.target = e, this.harness = t, this.get = t ? t.get : Fe, this.set = t ? t.getSetter : Vn;
}, xn = /*#__PURE__*/ function() {
	function e(e) {
		this.vars = e, this._delay = +e.delay || 0, (this._repeat = e.repeat === Infinity ? -2 : e.repeat || 0) && (this._rDelay = e.repeatDelay || 0, this._yoyo = !!e.yoyo || !!e.yoyoEase), this._ts = 1, yt(this, +e.duration, 1, 1), this.data = e.data, g && (this._ctx = g, g.data.push(this)), on || sn.wake();
	}
	var t = e.prototype;
	return t.delay = function(e) {
		return e || e === 0 ? (this.parent && this.parent.smoothChildTiming && this.startTime(this._start + e - this._delay), this._delay = e, this) : this._delay;
	}, t.duration = function(e) {
		return arguments.length ? this.totalDuration(this._repeat > 0 ? e + (e + this._rDelay) * this._repeat : e) : this.totalDuration() && this._dur;
	}, t.totalDuration = function(e) {
		return arguments.length ? (this._dirty = 0, yt(this, this._repeat < 0 ? e : (e - this._repeat * this._rDelay) / (this._repeat + 1))) : this._tDur;
	}, t.totalTime = function(e, t) {
		if (cn(), !arguments.length) return this._tTime;
		var n = this._dp;
		if (n && n.smoothChildTiming && this._ts) {
			for (ut(this, e), !n._dp || n.parent || dt(n, this); n && n.parent;) n.parent._time !== n._start + (n._ts >= 0 ? n._tTime / n._ts : (n.totalDuration() - n._tTime) / -n._ts) && n.totalTime(n._tTime, !0), n = n.parent;
			!this.parent && this._dp.autoRemoveChildren && (this._ts > 0 && e < this._tDur || this._ts < 0 && e > 0 || !this._tDur && !e) && ft(this._dp, this, this._start - this._delay);
		}
		return (this._tTime !== e || !this._dur && !t || this._initted && Math.abs(this._zTime) === v || !this._initted && this._dur && e || !e && !this._initted && (this.add || this._ptLookup)) && (this._ts || (this._pTime = e), Ue(this, e, t)), this;
	}, t.time = function(e, t) {
		return arguments.length ? this.totalTime(Math.min(this.totalDuration(), e + ot(this)) % (this._dur + this._rDelay) || (e ? this._dur : 0), t) : this._time;
	}, t.totalProgress = function(e, t) {
		return arguments.length ? this.totalTime(this.totalDuration() * e, t) : this.totalDuration() ? Math.min(1, this._tTime / this._tDur) : this.rawTime() >= 0 && this._initted ? 1 : 0;
	}, t.progress = function(e, t) {
		return arguments.length ? this.totalTime(this.duration() * (this._yoyo && !(this.iteration() & 1) ? 1 - e : e) + ot(this), t) : this.duration() ? Math.min(1, this._time / this._dur) : +(this.rawTime() > 0);
	}, t.iteration = function(e, t) {
		var n = this.duration() + this._rDelay;
		return arguments.length ? this.totalTime(this._time + (e - 1) * n, t) : this._repeat ? st(this._tTime, n) + 1 : 1;
	}, t.timeScale = function(e, t) {
		if (!arguments.length) return this._rts === -v ? 0 : this._rts;
		if (this._rts === e) return this;
		var n = this.parent && this._ts ? ct(this.parent._time, this) : this._tTime;
		return this._rts = +e || 0, this._ts = this._ps || e === -v ? 0 : this._rts, this.totalTime(Tt(-Math.abs(this._delay), this.totalDuration(), n), t !== !1), lt(this), rt(this);
	}, t.paused = function(e) {
		return arguments.length ? (this._ps !== e && (this._ps = e, e ? (this._pTime = this._tTime || Math.max(-this._delay, this.rawTime()), this._ts = this._act = 0) : (cn(), this._ts = this._rts, this.totalTime(this.parent && !this.parent.smoothChildTiming ? this.rawTime() : this._tTime || this._pTime, this.progress() === 1 && Math.abs(this._zTime) !== v && (this._tTime -= v)))), this) : this._ps;
	}, t.startTime = function(e) {
		if (arguments.length) {
			this._start = Re(e);
			var t = this.parent || this._dp;
			return t && (t._sort || !this.parent) && ft(t, this, this._start - this._delay), this;
		}
		return this._start;
	}, t.endTime = function(e) {
		return this._start + (A(e) ? this.totalDuration() : this.duration()) / Math.abs(this._ts || 1);
	}, t.rawTime = function(e) {
		var t = this.parent || this._dp;
		return t ? e && (!this._ts || this._repeat && this._time && this.totalProgress() < 1) ? this._tTime % (this._dur + this._rDelay) : this._ts ? ct(t.rawTime(e), this) : this._tTime : this._tTime;
	}, t.revert = function(e) {
		e === void 0 && (e = P);
		var t = h;
		return h = e, He(this) && (this.timeline && this.timeline.revert(e), this.totalTime(-.01, e.suppressEvents)), this.data !== "nested" && e.kill !== !1 && this.kill(), h = t, this;
	}, t.globalTime = function(e) {
		for (var t = this, n = arguments.length ? e : t.rawTime(); t;) n = t._start + n / (Math.abs(t._ts) || 1), t = t._dp;
		return !this.parent && this._sat ? this._sat.globalTime(e) : n;
	}, t.repeat = function(e) {
		return arguments.length ? (this._repeat = e === Infinity ? -2 : e, bt(this)) : this._repeat === -2 ? Infinity : this._repeat;
	}, t.repeatDelay = function(e) {
		if (arguments.length) {
			var t = this._time;
			return this._rDelay = e, bt(this), t ? this.time(t) : this;
		}
		return this._rDelay;
	}, t.yoyo = function(e) {
		return arguments.length ? (this._yoyo = e, this) : this._yoyo;
	}, t.seek = function(e, t) {
		return this.totalTime(St(this, e), A(t));
	}, t.restart = function(e, t) {
		return this.play().totalTime(e ? -this._delay : 0, A(t)), this._dur || (this._zTime = -v), this;
	}, t.play = function(e, t) {
		return e != null && this.seek(e, t), this.reversed(!1).paused(!1);
	}, t.reverse = function(e, t) {
		return e != null && this.seek(e || this.totalDuration(), t), this.reversed(!0).paused(!1);
	}, t.pause = function(e, t) {
		return e != null && this.seek(e, t), this.paused(!0);
	}, t.resume = function() {
		return this.paused(!1);
	}, t.reversed = function(e) {
		return arguments.length ? (!!e !== this.reversed() && this.timeScale(-this._rts || (e ? -v : 0)), this) : this._rts < 0;
	}, t.invalidate = function() {
		return this._initted = this._act = 0, this._zTime = -v, this;
	}, t.isActive = function() {
		var e = this.parent || this._dp, t = this._start, n;
		return !!(!e || this._ts && this._initted && e.isActive() && (n = e.rawTime(!0)) >= t && n < this.endTime(!0) - v);
	}, t.eventCallback = function(e, t, n) {
		var r = this.vars;
		return arguments.length > 1 ? (t ? (r[e] = t, n && (r[e + "Params"] = n), e === "onUpdate" && (this._onUpdate = t)) : delete r[e], this) : r[e];
	}, t.then = function(e) {
		var t = this, n = t._prom;
		return new Promise(function(r) {
			var i = E(e) ? e : Ge, a = function() {
				var e = t.then;
				t.then = null, n && n(), E(i) && (i = i(t)) && (i.then || i === t) && (t.then = e), r(i), t.then = e;
			};
			t._initted && t.totalProgress() === 1 && t._ts >= 0 || !t._tTime && t._ts < 0 ? a() : t._prom = a;
		});
	}, t.kill = function() {
		Jt(this);
	}, e;
}();
Ke(xn.prototype, {
	_time: 0,
	_start: 0,
	_end: 0,
	_tTime: 0,
	_tDur: 0,
	_dirty: 0,
	_repeat: 0,
	_yoyo: !1,
	parent: null,
	_initted: !1,
	_rDelay: 0,
	_ts: 1,
	_dp: 0,
	ratio: 0,
	_zTime: -v,
	_prom: 0,
	_ps: !1,
	_rts: 1
});
var Sn = /*#__PURE__*/ function(e) {
	d(t, e);
	function t(t, n) {
		var r;
		return t === void 0 && (t = {}), r = e.call(this, t) || this, r.labels = {}, r.smoothChildTiming = !!t.smoothChildTiming, r.autoRemoveChildren = !!t.autoRemoveChildren, r._sort = A(t.sortChildren), fe && ft(t.parent || fe, u(r), n), t.reversed && r.reverse(), t.paused && r.paused(!0), t.scrollTrigger && pt(u(r), t.scrollTrigger), r;
	}
	var n = t.prototype;
	return n.to = function(e, t, n) {
		return Ct(0, arguments, this), this;
	}, n.from = function(e, t, n) {
		return Ct(1, arguments, this), this;
	}, n.fromTo = function(e, t, n, r) {
		return Ct(2, arguments, this), this;
	}, n.set = function(e, t, n) {
		return t.duration = 0, t.parent = this, Ze(t).repeatDelay || (t.repeat = 0), t.immediateRender = !!t.immediateRender, new In(e, t, St(this, n), 1), this;
	}, n.call = function(e, t, n) {
		return ft(this, In.delayedCall(0, e, t), n);
	}, n.staggerTo = function(e, t, n, r, i, a, o) {
		return n.duration = t, n.stagger = n.stagger || r, n.onComplete = a, n.onCompleteParams = o, n.parent = this, new In(e, n, St(this, i)), this;
	}, n.staggerFrom = function(e, t, n, r, i, a, o) {
		return n.runBackwards = 1, Ze(n).immediateRender = A(n.immediateRender), this.staggerTo(e, t, n, r, i, a, o);
	}, n.staggerFromTo = function(e, t, n, r, i, a, o, s) {
		return r.startAt = n, Ze(r).immediateRender = A(r.immediateRender), this.staggerTo(e, t, r, i, a, o, s);
	}, n.render = function(e, t, n) {
		var r = this._time, i = this._dirty ? this.totalDuration() : this._tDur, a = this._dur, o = e <= 0 ? 0 : Re(e), s = this._zTime < 0 != e < 0 && (this._initted || !a), c, l, u, d, f, p, m, g, _, y, b, x;
		if (this !== fe && o > i && e >= 0 && (o = i), o !== this._tTime || n || s) {
			if (r !== this._time && a && (o += this._time - r, e += this._time - r), c = o, _ = this._start, g = this._ts, p = !g, s && (a || (r = this._zTime), (e || !t) && (this._zTime = e)), this._repeat) {
				if (b = this._yoyo, f = a + this._rDelay, this._repeat < -1 && e < 0) return this.totalTime(f * 100 + e, t, n);
				if (c = Re(o % f), o === i ? (d = this._repeat, c = a) : (y = Re(o / f), d = ~~y, d && d === y && (c = a, d--), c > a && (c = a)), y = st(this._tTime, f), !r && this._tTime && y !== d && this._tTime - y * f - this._dur <= 0 && (y = d), b && d & 1 && (c = a - c, x = 1), d !== y && !this._lock) {
					var S = b && y & 1, C = S === (b && d & 1);
					if (d < y && (S = !S), r = S ? 0 : o % a ? a : o, this._lock = 1, this.render(r || (x ? 0 : Re(d * f)), t, !a)._lock = 0, this._tTime = o, !t && this.parent && qt(this, "onRepeat"), this.vars.repeatRefresh && !x && (this.invalidate()._lock = 1, y = d), r && r !== this._time || p !== !this._ts || this.vars.onRepeat && !this.parent && !this._act || (a = this._dur, i = this._tDur, C && (this._lock = 2, r = S ? a : -1e-4, this.render(r, !0), this.vars.repeatRefresh && !x && this.invalidate()), this._lock = 0, !this._ts && !p)) return this;
				}
			}
			if (this._hasPause && !this._forcing && this._lock < 2 && (m = vt(this, Re(r), Re(c)), m && (o -= c - (c = m._start))), this._tTime = o, this._time = c, this._act = !!g, this._initted || (this._onUpdate = this.vars.onUpdate, this._initted = 1, this._zTime = e, r = 0), !r && o && a && !t && !y && (qt(this, "onStart"), this._tTime !== o)) return this;
			if (c >= r && e >= 0) for (l = this._first; l;) {
				if (u = l._next, (l._act || c >= l._start) && l._ts && m !== l) {
					if (l.parent !== this) return this.render(e, t, n);
					if (l.render(l._ts > 0 ? (c - l._start) * l._ts : (l._dirty ? l.totalDuration() : l._tDur) + (c - l._start) * l._ts, t, n), c !== this._time || !this._ts && !p) {
						m = 0, u && (o += this._zTime = -v);
						break;
					}
				}
				l = u;
			}
			else {
				l = this._last;
				for (var w = e < 0 ? e : c; l;) {
					if (u = l._prev, (l._act || w <= l._end) && l._ts && m !== l) {
						if (l.parent !== this) return this.render(e, t, n);
						if (l.render(l._ts > 0 ? (w - l._start) * l._ts : (l._dirty ? l.totalDuration() : l._tDur) + (w - l._start) * l._ts, t, n || h && He(l)), c !== this._time || !this._ts && !p) {
							m = 0, u && (o += this._zTime = w ? -v : v);
							break;
						}
					}
					l = u;
				}
			}
			if (m && !t && (this.pause(), m.render(c >= r ? 0 : -v)._zTime = c >= r ? 1 : -1, this._ts)) return this._start = _, lt(this), this.render(e, t, n);
			this._onUpdate && !t && qt(this, "onUpdate", !0), (o === i && this._tTime >= this.totalDuration() || !o && r) && (_ !== this._start && Math.abs(g) === Math.abs(this._ts) || this._lock || ((e || !a) && (o === i && this._ts > 0 || !o && this._ts < 0) && tt(this, 1), t || e < 0 && !r || !o && !r && i || (qt(this, o === i && e >= 0 ? "onComplete" : "onReverseComplete", !0), this._prom && !(o < i && this.timeScale() > 0) && this._prom())));
		}
		return this;
	}, n.add = function(e, t) {
		var n = this;
		if (D(t) || (t = St(this, t, e)), !(e instanceof xn)) {
			if (j(e)) return e.forEach(function(e) {
				return n.add(e, t);
			}), this;
			if (T(e)) return this.addLabel(e, t);
			if (E(e)) e = In.delayedCall(0, e);
			else return this;
		}
		return this === e ? this : ft(this, e, t);
	}, n.getChildren = function(e, t, n, r) {
		e === void 0 && (e = !0), t === void 0 && (t = !0), n === void 0 && (n = !0), r === void 0 && (r = -_);
		for (var i = [], a = this._first; a;) a._start >= r && (a instanceof In ? t && i.push(a) : (n && i.push(a), e && i.push.apply(i, a.getChildren(!0, t, n)))), a = a._next;
		return i;
	}, n.getById = function(e) {
		for (var t = this.getChildren(1, 1, 1), n = t.length; n--;) if (t[n].vars.id === e) return t[n];
	}, n.remove = function(e) {
		return T(e) ? this.removeLabel(e) : E(e) ? this.killTweensOf(e) : (e.parent === this && et(this, e), e === this._recent && (this._recent = this._last), nt(this));
	}, n.totalTime = function(t, n) {
		return arguments.length ? (this._forcing = 1, !this._dp && this._ts && (this._start = Re(sn.time - (this._ts > 0 ? t / this._ts : (this.totalDuration() - t) / -this._ts))), e.prototype.totalTime.call(this, t, n), this._forcing = 0, this) : this._tTime;
	}, n.addLabel = function(e, t) {
		return this.labels[e] = St(this, t), this;
	}, n.removeLabel = function(e) {
		return delete this.labels[e], this;
	}, n.addPause = function(e, t, n) {
		var r = In.delayedCall(0, t || xe, n);
		return r.data = "isPause", this._hasPause = 1, ft(this, r, St(this, e));
	}, n.removePause = function(e) {
		var t = this._first;
		for (e = St(this, e); t;) t._start === e && t.data === "isPause" && tt(t), t = t._next;
	}, n.killTweensOf = function(e, t, n) {
		for (var r = this.getTweensOf(e, n), i = r.length; i--;) Dn !== r[i] && r[i].kill(e, t);
		return this;
	}, n.getTweensOf = function(e, t) {
		for (var n = [], r = At(e), i = this._first, a = D(t), o; i;) i instanceof In ? Be(i._targets, r) && (a ? (!Dn || i._initted && i._ts) && i.globalTime(0) <= t && i.globalTime(i.totalDuration()) > t : !t || i.isActive()) && n.push(i) : (o = i.getTweensOf(r, t)).length && n.push.apply(n, o), i = i._next;
		return n;
	}, n.tweenTo = function(e, t) {
		t ||= {};
		var n = this, r = St(n, e), i = t, a = i.startAt, o = i.onStart, s = i.onStartParams, c = i.immediateRender, l, u = In.to(n, Ke({
			ease: t.ease || "none",
			lazy: !1,
			immediateRender: !1,
			time: r,
			overwrite: "auto",
			duration: t.duration || Math.abs((r - (a && "time" in a ? a.time : n._time)) / n.timeScale()) || v,
			onStart: function() {
				if (n.pause(), !l) {
					var e = t.duration || Math.abs((r - (a && "time" in a ? a.time : n._time)) / n.timeScale());
					u._dur !== e && yt(u, e, 0, 1).render(u._time, !0, !0), l = 1;
				}
				o && o.apply(u, s || []);
			}
		}, t));
		return c ? u.render(0) : u;
	}, n.tweenFromTo = function(e, t, n) {
		return this.tweenTo(t, Ke({ startAt: { time: St(this, e) } }, n));
	}, n.recent = function() {
		return this._recent;
	}, n.nextLabel = function(e) {
		return e === void 0 && (e = this._time), Kt(this, St(this, e));
	}, n.previousLabel = function(e) {
		return e === void 0 && (e = this._time), Kt(this, St(this, e), 1);
	}, n.currentLabel = function(e) {
		return arguments.length ? this.seek(e, !0) : this.previousLabel(this._time + v);
	}, n.shiftChildren = function(e, t, n) {
		n === void 0 && (n = 0);
		var r = this._first, i = this.labels, a;
		for (e = Re(e); r;) r._start >= n && (r._start += e, r._end += e), r = r._next;
		if (t) for (a in i) i[a] >= n && (i[a] += e);
		return nt(this);
	}, n.invalidate = function(t) {
		var n = this._first;
		for (this._lock = 0; n;) n.invalidate(t), n = n._next;
		return e.prototype.invalidate.call(this, t);
	}, n.clear = function(e) {
		e === void 0 && (e = !0);
		for (var t = this._first, n; t;) n = t._next, this.remove(t), t = n;
		return this._dp && (this._time = this._tTime = this._pTime = 0), e && (this.labels = {}), nt(this);
	}, n.totalDuration = function(e) {
		var t = 0, n = this, r = n._last, i = _, a, o, s;
		if (arguments.length) return n.timeScale((n._repeat < 0 ? n.duration() : n.totalDuration()) / (n.reversed() ? -e : e));
		if (n._dirty) {
			for (s = n.parent; r;) a = r._prev, r._dirty && r.totalDuration(), o = r._start, o > i && n._sort && r._ts && !n._lock ? (n._lock = 1, ft(n, r, o - r._delay, 1)._lock = 0) : i = o, o < 0 && r._ts && (t -= o, (!s && !n._dp || s && s.smoothChildTiming) && (n._start += Re(o / n._ts), n._time -= o, n._tTime -= o), n.shiftChildren(-o, !1, -Infinity), i = 0), r._end > t && r._ts && (t = r._end), r = a;
			yt(n, n === fe && n._time > t ? n._time : t, 1, 1), n._dirty = 0;
		}
		return n._tDur;
	}, t.updateRoot = function(e) {
		if (fe._ts && (Ue(fe, ct(e, fe)), De = sn.frame), sn.frame >= Ae) {
			Ae += f.autoSleep || 120;
			var t = fe._first;
			if ((!t || !t._ts) && f.autoSleep && sn._listeners.length < 2) {
				for (; t && !t._ts;) t = t._next;
				t || sn.sleep();
			}
		}
	}, t;
}(xn);
Ke(Sn.prototype, {
	_lock: 0,
	_hasPause: 0,
	_forcing: 0
});
var Cn = function(e, t, n, r, i, a, o) {
	var s = new Xn(this._pt, e, t, 0, 1, Wn, null, i), c = 0, l = 0, u, d, f, p, m, h, g, _;
	for (s.b = n, s.e = r, n += "", r += "", (g = ~r.indexOf("random(")) && (r = Ut(r)), a && (_ = [n, r], a(_, e, t), n = _[0], r = _[1]), d = n.match(ce) || []; u = ce.exec(r);) p = u[0], m = r.substring(c, u.index), f ? f = (f + 1) % 5 : m.substr(-5) === "rgba(" && (f = 1), p !== d[l++] && (h = parseFloat(d[l - 1]) || 0, s._pt = {
		_next: s._pt,
		p: m || l === 1 ? m : ",",
		s: h,
		c: p.charAt(1) === "=" ? ze(h, p) - h : parseFloat(p) - h,
		m: f && f < 4 ? Math.round : 0
	}, c = ce.lastIndex);
	return s.c = c < r.length ? r.substring(c, r.length) : "", s.fp = o, (le.test(r) || g) && (s.e = 0), this._pt = s, s;
}, wn = function(e, t, n, r, i, a, o, s, c, l) {
	E(r) && (r = r(i || 0, e, a));
	var u = e[t], d = n === "get" ? E(u) ? c ? e[t.indexOf("set") || !E(e["get" + t.substr(3)]) ? t : "get" + t.substr(3)](c) : e[t]() : u : n, p = E(u) ? c ? zn : Rn : Ln, m;
	if (T(r) && (~r.indexOf("random(") && (r = Ut(r)), r.charAt(1) === "=" && (m = ze(d, r) + (F(d) || 0), (m || m === 0) && (r = m))), !l || d !== r || On) return !isNaN(d * r) && r !== "" ? (m = new Xn(this._pt, e, t, +d || 0, r - (d || 0), typeof u == "boolean" ? Un : Hn, 0, p), c && (m.fp = c), o && m.modifier(o, this, e), this._pt = m) : (!u && !(t in e) && N(t, r), Cn.call(this, e, t, d, r, p, s || f.stringFilter, c));
}, Tn = function(e, t, n, r, i) {
	if (E(e) && (e = Nn(e, i, t, n, r)), !k(e) || e.style && e.nodeType || j(e) || ne(e)) return T(e) ? Nn(e, i, t, n, r) : e;
	var a = {}, o;
	for (o in e) a[o] = Nn(e[o], i, t, n, r);
	return a;
}, En = function(e, t, n, r, i, a) {
	var o, s, c, l;
	if (Oe[e] && (o = new Oe[e]()).init(i, o.rawVars ? t[e] : Tn(t[e], r, i, a, n), n, r, a) !== !1 && (n._pt = s = new Xn(n._pt, i, e, 0, 1, o.render, o, 0, o.priority), n !== I)) for (c = n._ptLookup[n._targets.indexOf(i)], l = o._props.length; l--;) c[o._props[l]] = s;
	return o;
}, Dn, On, kn = function e(t, n, r) {
	var i = t.vars, a = i.ease, o = i.startAt, s = i.immediateRender, c = i.lazy, l = i.onUpdate, u = i.runBackwards, d = i.yoyoEase, f = i.keyframes, g = i.autoRevert, y = t._dur, b = t._startAt, x = t._targets, S = t.parent, C = S && S.data === "nested" ? S.vars.targets : x, w = t._overwrite === "auto" && !m, T = t.timeline, E = i.easeReverse || d, D, O, k, ee, te, ne, j, re, ie, ae, oe, se, ce;
	if (!T || f && a || (a = "none"), t._ease = hn(a, p.ease), t._rEase = E && (hn(E) || t._ease), t._from = !T && !!i.runBackwards, t._from && (t.ratio = 1), !T || f && !i.stagger) {
		if (re = x[0] ? Pe(x[0]).harness : 0, se = re && i[re.prop], D = Xe(i, we), b && (b._zTime < 0 && b.progress(1), n < 0 && u && s && !g ? b.render(-1, !0) : b.revert(u && y ? Ce : Se), b._lazy = 0), o) {
			if (tt(t._startAt = In.set(x, Ke({
				data: "isStart",
				overwrite: !1,
				parent: S,
				immediateRender: !0,
				lazy: !b && A(c),
				startAt: null,
				delay: 0,
				onUpdate: l && function() {
					return qt(t, "onUpdate");
				},
				stagger: 0
			}, o))), t._startAt._dp = 0, t._startAt._sat = t, n < 0 && (h || !s && !g) && t._startAt.revert(Ce), s && y && n <= 0 && r <= 0) {
				n && (t._zTime = n);
				return;
			}
		} else if (u && y && !b) {
			if (n && (s = !1), k = Ke({
				overwrite: !1,
				data: "isFromStart",
				lazy: s && !b && A(c),
				immediateRender: s,
				stagger: 0,
				parent: S
			}, D), se && (k[re.prop] = se), tt(t._startAt = In.set(x, k)), t._startAt._dp = 0, t._startAt._sat = t, n < 0 && (h ? t._startAt.revert(Ce) : t._startAt.render(-1, !0)), t._zTime = n, !s) e(t._startAt, v, v);
			else if (!n) return;
		}
		for (t._pt = t._ptCache = 0, c = y && A(c) || c && !y, O = 0; O < x.length; O++) {
			if (te = x[O], j = te._gsap || Ne(x)[O]._gsap, t._ptLookup[O] = ae = {}, Ee[j.id] && Te.length && Ve(), oe = C === x ? O : C.indexOf(te), re && (ie = new re()).init(te, se || D, t, oe, C) !== !1 && (t._pt = ee = new Xn(t._pt, te, ie.name, 0, 1, ie.render, ie, 0, ie.priority), ie._props.forEach(function(e) {
				ae[e] = ee;
			}), ie.priority && (ne = 1)), !re || se) for (k in D) Oe[k] && (ie = En(k, D, t, oe, te, C)) ? ie.priority && (ne = 1) : ae[k] = ee = wn.call(t, te, k, "get", D[k], oe, C, 0, i.stringFilter);
			t._op && t._op[O] && t.kill(te, t._op[O]), w && t._pt && (Dn = t, fe.killTweensOf(te, ae, t.globalTime(n)), ce = !t.parent, Dn = 0), t._pt && c && (Ee[j.id] = 1);
		}
		ne && Yn(t), t._onInit && t._onInit(t);
	}
	t._onUpdate = l, t._initted = (!t._op || t._pt) && !ce, f && n <= 0 && T.render(_, !0, !0);
}, An = function(e, t, n, r, i, a, o, s) {
	var c = (e._pt && e._ptCache || (e._ptCache = {}))[t], l, u, d, f;
	if (!c) for (c = e._ptCache[t] = [], d = e._ptLookup, f = e._targets.length; f--;) {
		if (l = d[f][t], l && l.d && l.d._pt) for (l = l.d._pt; l && l.p !== t && l.fp !== t;) l = l._next;
		if (!l) return On = 1, e.vars[t] = "+=0", kn(e, o), On = 0, s ? ye(t + " not eligible for reset. Try splitting into individual properties") : 1;
		c.push(l);
	}
	for (f = c.length; f--;) u = c[f], l = u._pt || u, l.s = (r || r === 0) && !i ? r : l.s + (r || 0) + a * l.c, l.c = n - l.s, u.e && (u.e = Le(n) + F(u.e)), u.b && (u.b = l.s + F(u.b));
}, jn = function(e, t) {
	var n = e[0] ? Pe(e[0]).harness : 0, r = n && n.aliases, i, a, o, s;
	if (!r) return t;
	for (a in i = Je({}, t), r) if (a in i) for (s = r[a].split(","), o = s.length; o--;) i[s[o]] = i[a];
	return i;
}, Mn = function(e, t, n, r) {
	var i = t.ease || r || "power1.inOut", a, o;
	if (j(t)) o = n[e] || (n[e] = []), t.forEach(function(e, n) {
		return o.push({
			t: n / (t.length - 1) * 100,
			v: e,
			e: i
		});
	});
	else for (a in t) o = n[a] || (n[a] = []), a === "ease" || o.push({
		t: parseFloat(e),
		v: t[a],
		e: i
	});
}, Nn = function(e, t, n, r, i) {
	return E(e) ? e.call(t, n, r, i) : T(e) && ~e.indexOf("random(") ? Ut(e) : e;
}, Pn = Me + "repeat,repeatDelay,yoyo,repeatRefresh,yoyoEase,easeReverse,autoRevert", Fn = {};
Ie(Pn + ",id,stagger,delay,duration,paused,scrollTrigger", function(e) {
	return Fn[e] = 1;
});
var In = /*#__PURE__*/ function(e) {
	d(t, e);
	function t(t, n, r, i) {
		var a;
		typeof n == "number" && (r.duration = n, n = r, r = null), a = e.call(this, i ? n : Ze(n)) || this;
		var o = a.vars, s = o.duration, c = o.delay, l = o.immediateRender, d = o.stagger, p = o.overwrite, h = o.keyframes, g = o.defaults, _ = o.scrollTrigger, y = n.parent || fe, b = (j(t) || ne(t) ? D(t[0]) : "length" in n) ? [t] : At(t), x, S, C, w, T, E, O, ee;
		if (a._targets = b.length ? Ne(b) : ye("GSAP target " + t + " not found. https://gsap.com", !f.nullTargetWarn) || [], a._ptLookup = [], a._overwrite = p, h || d || te(s) || te(c)) {
			n = a.vars;
			var re = n.easeReverse || n.yoyoEase;
			if (x = a.timeline = new Sn({
				data: "nested",
				defaults: g || {},
				targets: y && y.data === "nested" ? y.vars.targets : b
			}), x.kill(), x.parent = x._dp = u(a), x._start = 0, d || te(s) || te(c)) {
				if (w = b.length, O = d && Nt(d), k(d)) for (T in d) ~Pn.indexOf(T) && (ee ||= {}, ee[T] = d[T]);
				for (S = 0; S < w; S++) C = Xe(n, Fn), C.stagger = 0, re && (C.easeReverse = re), ee && Je(C, ee), E = b[S], C.duration = +Nn(s, u(a), S, E, b), C.delay = (+Nn(c, u(a), S, E, b) || 0) - a._delay, !d && w === 1 && C.delay && (a._delay = c = C.delay, a._start += c, C.delay = 0), x.to(E, C, O ? O(S, E, b) : 0), x._ease = R.none;
				x.duration() ? s = c = 0 : a.timeline = 0;
			} else if (h) {
				Ze(Ke(x.vars.defaults, { ease: "none" })), x._ease = hn(h.ease || n.ease || "none");
				var ie = 0, ae, oe, se;
				if (j(h)) h.forEach(function(e) {
					return x.to(b, e, ">");
				}), x.duration();
				else {
					for (T in C = {}, h) T === "ease" || T === "easeEach" || Mn(T, h[T], C, h.easeEach);
					for (T in C) for (ae = C[T].sort(function(e, t) {
						return e.t - t.t;
					}), ie = 0, S = 0; S < ae.length; S++) oe = ae[S], se = {
						ease: oe.e,
						duration: (oe.t - (S ? ae[S - 1].t : 0)) / 100 * s
					}, se[T] = oe.v, x.to(b, se, ie), ie += se.duration;
					x.duration() < s && x.to({}, { duration: s - x.duration() });
				}
			}
			s || a.duration(s = x.duration());
		} else a.timeline = 0;
		return p === !0 && !m && (Dn = u(a), fe.killTweensOf(b), Dn = 0), ft(y, u(a), r), n.reversed && a.reverse(), n.paused && a.paused(!0), (l || !s && !h && a._start === Re(y._time) && A(l) && at(u(a)) && y.data !== "nested") && (a._tTime = -v, a.render(Math.max(0, -c) || 0)), _ && pt(u(a), _), a;
	}
	var n = t.prototype;
	return n.render = function(e, t, n) {
		var r = this._time, i = this._tDur, a = this._dur, o = e < 0, s = e > i - v && !o ? i : e < v ? 0 : e, c, l, u, d, f, p, m, h;
		if (!a) _t(this, e, t, n);
		else if (s !== this._tTime || !e || n || !this._initted && this._tTime || this._startAt && this._zTime < 0 !== o || this._lazy) {
			if (c = s, h = this.timeline, this._repeat) {
				if (d = a + this._rDelay, this._repeat < -1 && o) return this.totalTime(d * 100 + e, t, n);
				if (c = Re(s % d), s === i ? (u = this._repeat, c = a) : (f = Re(s / d), u = ~~f, u && u === f ? (c = a, u--) : c > a && (c = a)), p = this._yoyo && u & 1, p && (c = a - c), f = st(this._tTime, d), c === r && !n && this._initted && u === f) return this._tTime = s, this;
				u !== f && this.vars.repeatRefresh && !p && !this._lock && c !== d && this._initted && (this._lock = n = 1, this.render(Re(d * u), !0).invalidate()._lock = 0);
			}
			if (!this._initted) {
				if (mt(this, o ? e : c, n, t, s)) return this._tTime = 0, this;
				if (r !== this._time && !(n && this.vars.repeatRefresh && u !== f)) return this;
				if (a !== this._dur) return this.render(e, t, n);
			}
			if (this._rEase) {
				var g = c < r;
				if (g !== this._inv) {
					var _ = g ? r : a - r;
					this._inv = g, this._from && (this.ratio = 1 - this.ratio), this._invRatio = this.ratio, this._invTime = r, this._invRecip = _ ? (g ? -1 : 1) / _ : 0, this._invScale = g ? -this.ratio : 1 - this.ratio, this._invEase = g ? this._rEase : this._ease;
				}
				this.ratio = m = this._invRatio + this._invScale * this._invEase((c - this._invTime) * this._invRecip);
			} else this.ratio = m = this._ease(c / a);
			if (this._from && (this.ratio = m = 1 - m), this._tTime = s, this._time = c, !this._act && this._ts && (this._act = 1, this._lazy = 0), !r && s && !t && !f && (qt(this, "onStart"), this._tTime !== s)) return this;
			for (l = this._pt; l;) l.r(m, l.d), l = l._next;
			h && h.render(e < 0 ? e : h._dur * h._ease(c / this._dur), t, n) || this._startAt && (this._zTime = e), this._onUpdate && !t && (o && it(this, e, t, n), qt(this, "onUpdate")), this._repeat && u !== f && this.vars.onRepeat && !t && this.parent && qt(this, "onRepeat"), s !== this._tDur && s || this._tTime !== s || (o && !this._onUpdate && it(this, e, !0, !0), (e || !a) && (s === this._tDur && this._ts > 0 || !s && this._ts < 0) && tt(this, 1), !t && (!o || r) && (s || r || p) && (qt(this, s === i ? "onComplete" : "onReverseComplete", !0), this._prom && !(s < i && this.timeScale() > 0) && this._prom()));
		}
		return this;
	}, n.targets = function() {
		return this._targets;
	}, n.invalidate = function(t) {
		return t && this.vars.runBackwards || (this._startAt = 0), this._pt = this._op = this._onUpdate = this._lazy = this.ratio = 0, this._ptLookup = [], this.timeline && this.timeline.invalidate(t), e.prototype.invalidate.call(this, t);
	}, n.resetTo = function(e, t, n, r, i) {
		on || sn.wake(), this._ts || this.play();
		var a = Math.min(this._dur, (this._dp._time - this._start) * this._ts), o;
		return this._initted || kn(this, a), o = this._ease(a / this._dur), An(this, e, t, n, r, o, a, i) ? this.resetTo(e, t, n, r, 1) : (ut(this, 0), this.parent || $e(this._dp, this, "_first", "_last", this._dp._sort ? "_start" : 0), this.render(0));
	}, n.kill = function(e, t) {
		if (t === void 0 && (t = "all"), !e && (!t || t === "all")) return this._lazy = this._pt = 0, this.parent ? Jt(this) : this.scrollTrigger && this.scrollTrigger.kill(!!h), this;
		if (this.timeline) {
			var n = this.timeline.totalDuration();
			return this.timeline.killTweensOf(e, t, Dn && Dn.vars.overwrite !== !0)._first || Jt(this), this.parent && n !== this.timeline.totalDuration() && yt(this, this._dur * this.timeline._tDur / n, 0, 1), this;
		}
		var r = this._targets, i = e ? At(e) : r, a = this._ptLookup, o = this._pt, s, c, l, u, d, f, p;
		if ((!t || t === "all") && Qe(r, i)) return t === "all" && (this._pt = 0), Jt(this);
		for (s = this._op = this._op || [], t !== "all" && (T(t) && (d = {}, Ie(t, function(e) {
			return d[e] = 1;
		}), t = d), t = jn(r, t)), p = r.length; p--;) if (~i.indexOf(r[p])) for (d in c = a[p], t === "all" ? (s[p] = t, u = c, l = {}) : (l = s[p] = s[p] || {}, u = t), u) f = c && c[d], f && ("kill" in f.d && f.d.kill(d) !== !0 || et(this, f, "_pt"), delete c[d]), l !== "all" && (l[d] = 1);
		return this._initted && !this._pt && o && Jt(this), this;
	}, t.to = function(e, n) {
		return new t(e, n, arguments[2]);
	}, t.from = function(e, t) {
		return Ct(1, arguments);
	}, t.delayedCall = function(e, n, r, i) {
		return new t(n, 0, {
			immediateRender: !1,
			lazy: !1,
			overwrite: !1,
			delay: e,
			onComplete: n,
			onReverseComplete: n,
			onCompleteParams: r,
			onReverseCompleteParams: r,
			callbackScope: i
		});
	}, t.fromTo = function(e, t, n) {
		return Ct(2, arguments);
	}, t.set = function(e, n) {
		return n.duration = 0, n.repeatDelay || (n.repeat = 0), new t(e, n);
	}, t.killTweensOf = function(e, t, n) {
		return fe.killTweensOf(e, t, n);
	}, t;
}(xn);
Ke(In.prototype, {
	_targets: [],
	_lazy: 0,
	_startAt: 0,
	_op: 0,
	_onInit: 0
}), Ie("staggerTo,staggerFrom,staggerFromTo", function(e) {
	In[e] = function() {
		var t = new Sn(), n = Dt.call(arguments, 0);
		return n.splice(e === "staggerFromTo" ? 5 : 4, 0, 0), t[e].apply(t, n);
	};
});
var Ln = function(e, t, n) {
	return e[t] = n;
}, Rn = function(e, t, n) {
	return e[t](n);
}, zn = function(e, t, n, r) {
	return e[t](r.fp, n);
}, Bn = function(e, t, n) {
	return e.setAttribute(t, n);
}, Vn = function(e, t) {
	return E(e[t]) ? Rn : O(e[t]) && e.setAttribute ? Bn : Ln;
}, Hn = function(e, t) {
	return t.set(t.t, t.p, Math.round((t.s + t.c * e) * 1e6) / 1e6, t);
}, Un = function(e, t) {
	return t.set(t.t, t.p, !!(t.s + t.c * e), t);
}, Wn = function(e, t) {
	var n = t._pt, r = "";
	if (!e && t.b) r = t.b;
	else if (e === 1 && t.e) r = t.e;
	else {
		for (; n;) r = n.p + (n.m ? n.m(n.s + n.c * e) : Math.round((n.s + n.c * e) * 1e4) / 1e4) + r, n = n._next;
		r += t.c;
	}
	t.set(t.t, t.p, r, t);
}, Gn = function(e, t) {
	for (var n = t._pt; n;) n.r(e, n.d), n = n._next;
}, Kn = function(e, t, n, r) {
	for (var i = this._pt, a; i;) a = i._next, i.p === r && i.modifier(e, t, n), i = a;
}, qn = function(e) {
	for (var t = this._pt, n, r; t;) r = t._next, t.p === e && !t.op || t.op === e ? et(this, t, "_pt") : t.dep || (n = 1), t = r;
	return !n;
}, Jn = function(e, t, n, r) {
	r.mSet(e, t, r.m.call(r.tween, n, r.mt), r);
}, Yn = function(e) {
	for (var t = e._pt, n, r, i, a; t;) {
		for (n = t._next, r = i; r && r.pr > t.pr;) r = r._next;
		(t._prev = r ? r._prev : a) ? t._prev._next = t : i = t, (t._next = r) ? r._prev = t : a = t, t = n;
	}
	e._pt = i;
}, Xn = /*#__PURE__*/ function() {
	function e(e, t, n, r, i, a, o, s, c) {
		this.t = t, this.s = r, this.c = i, this.p = n, this.r = a || Hn, this.d = o || this, this.set = s || Ln, this.pr = c || 0, this._next = e, e && (e._prev = this);
	}
	var t = e.prototype;
	return t.modifier = function(e, t, n) {
		this.mSet = this.mSet || this.set, this.set = Jn, this.m = e, this.mt = n, this.tween = t;
	}, e;
}();
Ie(Me + "parent,duration,ease,delay,overwrite,runBackwards,startAt,yoyo,immediateRender,repeat,repeatDelay,data,paused,reversed,lazy,callbackScope,stringFilter,id,yoyoEase,stagger,inherit,repeatRefresh,keyframes,autoRevert,scrollTrigger,easeReverse", function(e) {
	return we[e] = 1;
}), ge.TweenMax = ge.TweenLite = In, ge.TimelineLite = ge.TimelineMax = Sn, fe = new Sn({
	sortChildren: !1,
	defaults: p,
	autoRemoveChildren: !0,
	id: "root",
	smoothChildTiming: !0
}), f.stringFilter = an;
var Zn = [], Qn = {}, $n = [], er = 0, tr = 0, nr = function(e) {
	return (Qn[e] || $n).map(function(e) {
		return e();
	});
}, rr = function() {
	var e = Date.now(), t = [];
	e - er > 2 && (nr("matchMediaInit"), Zn.forEach(function(e) {
		var n = e.queries, r = e.conditions, i, a, o, s;
		for (a in n) i = pe.matchMedia(n[a]).matches, i && (o = 1), i !== r[a] && (r[a] = i, s = 1);
		s && (e.revert(), o && t.push(e));
	}), nr("matchMediaRevert"), t.forEach(function(e) {
		return e.onMatch(e, function(t) {
			return e.add(null, t);
		});
	}), er = e, nr("matchMedia"));
}, ir = /*#__PURE__*/ function() {
	function e(e, t) {
		this.selector = t && jt(t), this.data = [], this._r = [], this.isReverted = !1, this.id = tr++, e && this.add(e);
	}
	var t = e.prototype;
	return t.add = function(e, t, n) {
		E(e) && (n = t, t = e, e = E);
		var r = this, i = function() {
			var e = g, i = r.selector, a;
			return e && e !== r && e.data.push(r), n && (r.selector = jt(n)), g = r, a = t.apply(r, arguments), E(a) && r._r.push(a), g = e, r.selector = i, r.isReverted = !1, a;
		};
		return r.last = i, e === E ? i(r, function(e) {
			return r.add(null, e);
		}) : e ? r[e] = i : i;
	}, t.ignore = function(e) {
		var t = g;
		g = null, e(this), g = t;
	}, t.getTweens = function() {
		var t = [];
		return this.data.forEach(function(n) {
			return n instanceof e ? t.push.apply(t, n.getTweens()) : n instanceof In && !(n.parent && n.parent.data === "nested") && t.push(n);
		}), t;
	}, t.clear = function() {
		this._r.length = this.data.length = 0;
	}, t.kill = function(e, t) {
		var n = this;
		if (e ? (function() {
			for (var t = n.getTweens(), r = n.data.length, i; r--;) i = n.data[r], i.data === "isFlip" && (i.revert(), i.getChildren(!0, !0, !1).forEach(function(e) {
				return t.splice(t.indexOf(e), 1);
			}));
			for (t.map(function(e) {
				return {
					g: e._dur || e._delay || e._sat && !e._sat.vars.immediateRender ? e.globalTime(0) : -Infinity,
					t: e
				};
			}).sort(function(e, t) {
				return t.g - e.g || -Infinity;
			}).forEach(function(t) {
				return t.t.revert(e);
			}), r = n.data.length; r--;) i = n.data[r], i instanceof Sn ? i.data !== "nested" && (i.scrollTrigger && i.scrollTrigger.revert(), i.kill()) : !(i instanceof In) && i.revert && i.revert(e);
			n._r.forEach(function(t) {
				return t(e, n);
			}), n.isReverted = !0;
		})() : this.data.forEach(function(e) {
			return e.kill && e.kill();
		}), this.clear(), t) for (var r = Zn.length; r--;) Zn[r].id === this.id && Zn.splice(r, 1);
	}, t.revert = function(e) {
		this.kill(e || {});
	}, e;
}(), ar = /*#__PURE__*/ function() {
	function e(e) {
		this.contexts = [], this.scope = e, g && g.data.push(this);
	}
	var t = e.prototype;
	return t.add = function(e, t, n) {
		k(e) || (e = { matches: e });
		var r = new ir(0, n || this.scope), i = r.conditions = {}, a, o, s;
		for (o in g && !r.selector && (r.selector = g.selector), this.contexts.push(r), t = r.add("onMatch", t), r.queries = e, e) o === "all" ? s = 1 : (a = pe.matchMedia(e[o]), a && (Zn.indexOf(r) < 0 && Zn.push(r), (i[o] = a.matches) && (s = 1), a.addListener ? a.addListener(rr) : a.addEventListener("change", rr)));
		return s && t(r, function(e) {
			return r.add(null, e);
		}), this;
	}, t.revert = function(e) {
		this.kill(e || {});
	}, t.kill = function(e) {
		this.contexts.forEach(function(t) {
			return t.kill(e, !0);
		});
	}, e;
}(), or = {
	registerPlugin: function() {
		[...arguments].forEach(function(e) {
			return Xt(e);
		});
	},
	timeline: function(e) {
		return new Sn(e);
	},
	getTweensOf: function(e, t) {
		return fe.getTweensOf(e, t);
	},
	getProperty: function(e, t, n, r) {
		T(e) && (e = At(e)[0]);
		var i = Pe(e || {}).get, a = n ? Ge : We;
		return n === "native" && (n = ""), e && (t ? a((Oe[t] && Oe[t].get || i)(e, t, n, r)) : function(t, n, r) {
			return a((Oe[t] && Oe[t].get || i)(e, t, n, r));
		});
	},
	quickSetter: function(e, t, n) {
		if (e = At(e), e.length > 1) {
			var r = e.map(function(e) {
				return ur.quickSetter(e, t, n);
			}), i = r.length;
			return function(e) {
				for (var t = i; t--;) r[t](e);
			};
		}
		e = e[0] || {};
		var a = Oe[t], o = Pe(e), s = o.harness && (o.harness.aliases || {})[t] || t, c = a ? function(t) {
			var r = new a();
			I._pt = 0, r.init(e, n ? t + n : t, I, 0, [e]), r.render(1, r), I._pt && Gn(1, I);
		} : o.set(e, s);
		return a ? c : function(t) {
			return c(e, s, n ? t + n : t, o, 1);
		};
	},
	quickTo: function(e, t, n) {
		var r, i = ur.to(e, Ke((r = {}, r[t] = "+=0.1", r.paused = !0, r.stagger = 0, r), n || {})), a = function(e, n, r) {
			return i.resetTo(t, e, n, r);
		};
		return a.tween = i, a;
	},
	isTweening: function(e) {
		return fe.getTweensOf(e, !0).length > 0;
	},
	defaults: function(e) {
		return e && e.ease && (e.ease = hn(e.ease, p.ease)), Ye(p, e || {});
	},
	config: function(e) {
		return Ye(f, e || {});
	},
	registerEffect: function(e) {
		var t = e.name, n = e.effect, r = e.plugins, i = e.defaults, a = e.extendTimeline;
		(r || "").split(",").forEach(function(e) {
			return e && !Oe[e] && !ge[e] && ye(t + " effect requires " + e + " plugin.");
		}), ke[t] = function(e, t, r) {
			return n(At(e), Ke(t || {}, i), r);
		}, a && (Sn.prototype[t] = function(e, n, r) {
			return this.add(ke[t](e, k(n) ? n : (r = n) && {}, this), r);
		});
	},
	registerEase: function(e, t) {
		R[e] = hn(t);
	},
	parseEase: function(e, t) {
		return arguments.length ? hn(e, t) : R;
	},
	getById: function(e) {
		return fe.getById(e);
	},
	exportRoot: function(e, t) {
		e === void 0 && (e = {});
		var n = new Sn(e), r, i;
		for (n.smoothChildTiming = A(e.smoothChildTiming), fe.remove(n), n._dp = 0, n._time = n._tTime = fe._time, r = fe._first; r;) i = r._next, (t || !(!r._dur && r instanceof In && r.vars.onComplete === r._targets[0])) && ft(n, r, r._start - r._delay), r = i;
		return ft(fe, n, 0), n;
	},
	context: function(e, t) {
		return e ? new ir(e, t) : g;
	},
	matchMedia: function(e) {
		return new ar(e);
	},
	matchMediaRefresh: function() {
		return Zn.forEach(function(e) {
			var t = e.conditions, n, r;
			for (r in t) t[r] && (t[r] = !1, n = 1);
			n && e.revert();
		}) || rr();
	},
	addEventListener: function(e, t) {
		var n = Qn[e] || (Qn[e] = []);
		~n.indexOf(t) || n.push(t);
	},
	removeEventListener: function(e, t) {
		var n = Qn[e], r = n && n.indexOf(t);
		r >= 0 && n.splice(r, 1);
	},
	utils: {
		wrap: Vt,
		wrapYoyo: Ht,
		distribute: Nt,
		random: It,
		snap: Ft,
		normalize: zt,
		getUnit: F,
		clamp: Et,
		splitColor: $t,
		toArray: At,
		selector: jt,
		mapRange: Wt,
		pipe: Lt,
		unitize: Rt,
		interpolate: Gt,
		shuffle: Mt
	},
	install: M,
	effects: ke,
	ticker: sn,
	updateRoot: Sn.updateRoot,
	plugins: Oe,
	globalTimeline: fe,
	core: {
		PropTween: Xn,
		globals: be,
		Tween: In,
		Timeline: Sn,
		Animation: xn,
		getCache: Pe,
		_removeLinkedListItem: et,
		reverting: function() {
			return h;
		},
		context: function(e) {
			return e && g && (g.data.push(e), e._ctx = g), g;
		},
		suppressOverwrites: function(e) {
			return m = e;
		}
	}
};
Ie("to,from,fromTo,delayedCall,set,killTweensOf", function(e) {
	return or[e] = In[e];
}), sn.add(Sn.updateRoot), I = or.to({}, { duration: 0 });
var sr = function(e, t) {
	for (var n = e._pt; n && n.p !== t && n.op !== t && n.fp !== t;) n = n._next;
	return n;
}, cr = function(e, t) {
	var n = e._targets, r, i, a;
	for (r in t) for (i = n.length; i--;) a = e._ptLookup[i][r], (a &&= a.d) && (a._pt && (a = sr(a, r)), a && a.modifier && a.modifier(t[r], e, n[i], r));
}, lr = function(e, t) {
	return {
		name: e,
		headless: 1,
		rawVars: 1,
		init: function(e, n, r) {
			r._onInit = function(e) {
				var r, i;
				if (T(n) && (r = {}, Ie(n, function(e) {
					return r[e] = 1;
				}), n = r), t) {
					for (i in r = {}, n) r[i] = t(n[i]);
					n = r;
				}
				cr(e, n);
			};
		}
	};
}, ur = or.registerPlugin({
	name: "attr",
	init: function(e, t, n, r, i) {
		var a, o, s;
		for (a in this.tween = n, t) s = e.getAttribute(a) || "", o = this.add(e, "setAttribute", (s || 0) + "", t[a], r, i, 0, 0, a), o.op = a, o.b = s, this._props.push(a);
	},
	render: function(e, t) {
		for (var n = t._pt; n;) h ? n.set(n.t, n.p, n.b, n) : n.r(e, n.d), n = n._next;
	}
}, {
	name: "endArray",
	headless: 1,
	init: function(e, t) {
		for (var n = t.length; n--;) this.add(e, n, e[n] || 0, t[n], 0, 0, 0, 0, 0, 1);
	}
}, lr("roundProps", Pt), lr("modifiers"), lr("snap", Ft)) || or;
In.version = Sn.version = ur.version = "3.15.0", ve = 1, ee() && cn(), R.Power0, R.Power1, R.Power2, R.Power3, R.Power4, R.Linear, R.Quad, R.Cubic, R.Quart, R.Quint, R.Strong, R.Elastic, R.Back, R.SteppedEase, R.Bounce, R.Sine, R.Expo, R.Circ;
// node_modules/gsap/CSSPlugin.js
var dr, fr, pr, mr, hr, gr, _r, vr = function() {
	return typeof window < "u";
}, yr = {}, br = 180 / Math.PI, xr = Math.PI / 180, Sr = Math.atan2, Cr = 1e8, wr = /([A-Z])/g, Tr = /(left|right|width|margin|padding|x)/i, Er = /[\s,\(]\S/, Dr = {
	autoAlpha: "opacity,visibility",
	scale: "scaleX,scaleY",
	alpha: "opacity"
}, Or = function(e, t) {
	return t.set(t.t, t.p, Math.round((t.s + t.c * e) * 1e4) / 1e4 + t.u, t);
}, kr = function(e, t) {
	return t.set(t.t, t.p, e === 1 ? t.e : Math.round((t.s + t.c * e) * 1e4) / 1e4 + t.u, t);
}, Ar = function(e, t) {
	return t.set(t.t, t.p, e ? Math.round((t.s + t.c * e) * 1e4) / 1e4 + t.u : t.b, t);
}, jr = function(e, t) {
	return t.set(t.t, t.p, e === 1 ? t.e : e ? Math.round((t.s + t.c * e) * 1e4) / 1e4 + t.u : t.b, t);
}, Mr = function(e, t) {
	var n = t.s + t.c * e;
	t.set(t.t, t.p, ~~(n + (n < 0 ? -.5 : .5)) + t.u, t);
}, Nr = function(e, t) {
	return t.set(t.t, t.p, e ? t.e : t.b, t);
}, Pr = function(e, t) {
	return t.set(t.t, t.p, e === 1 ? t.e : t.b, t);
}, Fr = function(e, t, n) {
	return e.style[t] = n;
}, Ir = function(e, t, n) {
	return e.style.setProperty(t, n);
}, Lr = function(e, t, n) {
	return e._gsap[t] = n;
}, Rr = function(e, t, n) {
	return e._gsap.scaleX = e._gsap.scaleY = n;
}, zr = function(e, t, n, r, i) {
	var a = e._gsap;
	a.scaleX = a.scaleY = n, a.renderTransform(i, a);
}, Br = function(e, t, n, r, i) {
	var a = e._gsap;
	a[t] = n, a.renderTransform(i, a);
}, Vr = "transform", z = Vr + "Origin", Hr = function e(t, n) {
	var r = this, i = this.target, a = i.style, o = i._gsap;
	if (t in yr && a) {
		if (this.tfm = this.tfm || {}, t !== "transform") t = Dr[t] || t, ~t.indexOf(",") ? t.split(",").forEach(function(e) {
			return r.tfm[e] = si(i, e);
		}) : this.tfm[t] = o.x ? o[t] : si(i, t), t === z && (this.tfm.zOrigin = o.zOrigin);
		else return Dr.transform.split(",").forEach(function(t) {
			return e.call(r, t, n);
		});
		if (this.props.indexOf(Vr) >= 0) return;
		o.svg && (this.svgo = i.getAttribute("data-svg-origin"), this.props.push(z, n, "")), t = Vr;
	}
	(a || n) && this.props.push(t, n, a[t]);
}, Ur = function(e) {
	e.translate && (e.removeProperty("translate"), e.removeProperty("scale"), e.removeProperty("rotate"));
}, Wr = function() {
	for (var e = this.props, t = this.target, n = t.style, r = t._gsap, i = 0, a; i < e.length; i += 3) e[i + 1] ? e[i + 1] === 2 ? t[e[i]](e[i + 2]) : t[e[i]] = e[i + 2] : e[i + 2] ? n[e[i]] = e[i + 2] : n.removeProperty(e[i].substr(0, 2) === "--" ? e[i] : e[i].replace(wr, "-$1").toLowerCase());
	if (this.tfm) {
		for (a in this.tfm) r[a] = this.tfm[a];
		r.svg && (r.renderTransform(), t.setAttribute("data-svg-origin", this.svgo || "")), i = _r(), i && i.isStart || n[Vr] || (Ur(n), r.zOrigin && n[z] && (n[z] += " " + r.zOrigin + "px", r.zOrigin = 0, r.renderTransform()), r.uncache = 1);
	}
}, Gr = function(e, t) {
	var n = {
		target: e,
		props: [],
		revert: Wr,
		save: Hr
	};
	return e._gsap || ur.core.getCache(e), t && e.style && e.nodeType && t.split(",").forEach(function(e) {
		return n.save(e);
	}), n;
}, Kr, qr = function(e, t) {
	var n = fr.createElementNS ? fr.createElementNS((t || "http://www.w3.org/1999/xhtml").replace(/^https/, "http"), e) : fr.createElement(e);
	return n && n.style ? n : fr.createElement(e);
}, Jr = function e(t, n, r) {
	var i = getComputedStyle(t);
	return i[n] || i.getPropertyValue(n.replace(wr, "-$1").toLowerCase()) || i.getPropertyValue(n) || !r && e(t, Xr(n) || n, 1) || "";
}, Yr = "O,Moz,ms,Ms,Webkit".split(","), Xr = function(e, t, n) {
	var r = (t || hr).style, i = 5;
	if (e in r && !n) return e;
	for (e = e.charAt(0).toUpperCase() + e.substr(1); i-- && !(Yr[i] + e in r););
	return i < 0 ? null : (i === 3 ? "ms" : i >= 0 ? Yr[i] : "") + e;
}, Zr = function() {
	vr() && window.document && (dr = window, fr = dr.document, pr = fr.documentElement, hr = qr("div") || { style: {} }, qr("div"), Vr = Xr(Vr), z = Vr + "Origin", hr.style.cssText = "border-width:0;line-height:0;position:absolute;padding:0", Kr = !!Xr("perspective"), _r = ur.core.reverting, mr = 1);
}, Qr = function(e) {
	var t = e.ownerSVGElement, n = qr("svg", t && t.getAttribute("xmlns") || "http://www.w3.org/2000/svg"), r = e.cloneNode(!0), i;
	r.style.display = "block", n.appendChild(r), pr.appendChild(n);
	try {
		i = r.getBBox();
	} catch {}
	return n.removeChild(r), pr.removeChild(n), i;
}, $r = function(e, t) {
	for (var n = t.length; n--;) if (e.hasAttribute(t[n])) return e.getAttribute(t[n]);
}, ei = function(e) {
	var t, n;
	try {
		t = e.getBBox();
	} catch {
		t = Qr(e), n = 1;
	}
	return t && (t.width || t.height) || n || (t = Qr(e)), t && !t.width && !t.x && !t.y ? {
		x: +$r(e, [
			"x",
			"cx",
			"x1"
		]) || 0,
		y: +$r(e, [
			"y",
			"cy",
			"y1"
		]) || 0,
		width: 0,
		height: 0
	} : t;
}, ti = function(e) {
	return !(!e.getCTM || e.parentNode && !e.ownerSVGElement || !ei(e));
}, ni = function(e, t) {
	if (t) {
		var n = e.style, r;
		t in yr && t !== z && (t = Vr), n.removeProperty ? (r = t.substr(0, 2), (r === "ms" || t.substr(0, 6) === "webkit") && (t = "-" + t), n.removeProperty(r === "--" ? t : t.replace(wr, "-$1").toLowerCase())) : n.removeAttribute(t);
	}
}, ri = function(e, t, n, r, i, a) {
	var o = new Xn(e._pt, t, n, 0, 1, a ? Pr : Nr);
	return e._pt = o, o.b = r, o.e = i, e._props.push(n), o;
}, ii = {
	deg: 1,
	rad: 1,
	turn: 1
}, ai = {
	grid: 1,
	flex: 1
}, oi = function e(t, n, r, i) {
	var a = parseFloat(r) || 0, o = (r + "").trim().substr((a + "").length) || "px", s = hr.style, c = Tr.test(n), l = t.tagName.toLowerCase() === "svg", u = (l ? "client" : "offset") + (c ? "Width" : "Height"), d = 100, f = i === "px", p = i === "%", m, h, g, _;
	if (i === o || !a || ii[i] || ii[o]) return a;
	if (o !== "px" && !f && (a = e(t, n, r, "px")), _ = t.getCTM && ti(t), (p || o === "%") && (yr[n] || ~n.indexOf("adius"))) return m = _ ? t.getBBox()[c ? "width" : "height"] : t[u], Le(p ? a / m * d : a / 100 * m);
	if (s[c ? "width" : "height"] = d + (f ? o : i), h = i !== "rem" && ~n.indexOf("adius") || i === "em" && t.appendChild && !l ? t : t.parentNode, _ && (h = (t.ownerSVGElement || {}).parentNode), h && h !== fr && h.appendChild || (h = fr.body), g = h._gsap, g && p && g.width && c && g.time === sn.time && !g.uncache) return Le(a / g.width * d);
	if (p && (n === "height" || n === "width")) {
		var v = t.style[n];
		t.style[n] = d + i, m = t[u], v ? t.style[n] = v : ni(t, n);
	} else (p || o === "%") && !ai[Jr(h, "display")] && (s.position = Jr(t, "position")), h === t && (s.position = "static"), h.appendChild(hr), m = hr[u], h.removeChild(hr), s.position = "absolute";
	return c && p && (g = Pe(h), g.time = sn.time, g.width = h[u]), Le(f ? m * a / d : m && a ? d / m * a : 0);
}, si = function(e, t, n, r) {
	var i;
	return mr || Zr(), t in Dr && t !== "transform" && (t = Dr[t], ~t.indexOf(",") && (t = t.split(",")[0])), yr[t] && t !== "transform" ? (i = yi(e, r), i = t === "transformOrigin" ? i.svg ? i.origin : bi(Jr(e, z)) + " " + i.zOrigin + "px" : i[t]) : (i = e.style[t], (!i || i === "auto" || r || ~(i + "").indexOf("calc(")) && (i = fi[t] && fi[t](e, t, n) || Jr(e, t) || Fe(e, t) || +(t === "opacity"))), n && !~(i + "").trim().indexOf(" ") ? oi(e, t, i, n) + n : i;
}, ci = function(e, t, n, r) {
	if (!n || n === "none") {
		var i = Xr(t, e, 1), a = i && Jr(e, i, 1);
		a && a !== n ? (t = i, n = a) : t === "borderColor" && (n = Jr(e, "borderTopColor"));
	}
	var o = new Xn(this._pt, e.style, t, 0, 1, Wn), s = 0, c = 0, l, u, d, p, m, h, g, _, v, y, b, x;
	if (o.b = n, o.e = r, n += "", r += "", r.substring(0, 6) === "var(--" && (r = Jr(e, r.substring(4, r.indexOf(")")))), r === "auto" && (h = e.style[t], e.style[t] = r, r = Jr(e, t) || r, h ? e.style[t] = h : ni(e, t)), l = [n, r], an(l), n = l[0], r = l[1], d = n.match(se) || [], x = r.match(se) || [], x.length) {
		for (; u = se.exec(r);) g = u[0], v = r.substring(s, u.index), m ? m = (m + 1) % 5 : (v.substr(-5) === "rgba(" || v.substr(-5) === "hsla(") && (m = 1), g !== (h = d[c++] || "") && (p = parseFloat(h) || 0, b = h.substr((p + "").length), g.charAt(1) === "=" && (g = ze(p, g) + b), _ = parseFloat(g), y = g.substr((_ + "").length), s = se.lastIndex - y.length, y || (y = y || f.units[t] || b, s === r.length && (r += y, o.e += y)), b !== y && (p = oi(e, t, h, y) || 0), o._pt = {
			_next: o._pt,
			p: v || c === 1 ? v : ",",
			s: p,
			c: _ - p,
			m: m && m < 4 || t === "zIndex" ? Math.round : 0
		});
		o.c = s < r.length ? r.substring(s, r.length) : "";
	} else o.r = t === "display" && r === "none" ? Pr : Nr;
	return le.test(r) && (o.e = 0), this._pt = o, o;
}, li = {
	top: "0%",
	bottom: "100%",
	left: "0%",
	right: "100%",
	center: "50%"
}, ui = function(e) {
	var t = e.split(" "), n = t[0], r = t[1] || "50%";
	return (n === "top" || n === "bottom" || r === "left" || r === "right") && (e = n, n = r, r = e), t[0] = li[n] || n, t[1] = li[r] || r, t.join(" ");
}, di = function(e, t) {
	if (t.tween && t.tween._time === t.tween._dur) {
		var n = t.t, r = n.style, i = t.u, a = n._gsap, o, s, c;
		if (i === "all" || i === !0) r.cssText = "", s = 1;
		else for (i = i.split(","), c = i.length; --c > -1;) o = i[c], yr[o] && (s = 1, o = o === "transformOrigin" ? z : Vr), ni(n, o);
		s && (ni(n, Vr), a && (a.svg && n.removeAttribute("transform"), r.scale = r.rotate = r.translate = "none", yi(n, 1), a.uncache = 1, Ur(r)));
	}
}, fi = { clearProps: function(e, t, n, r, i) {
	if (i.data !== "isFromStart") {
		var a = e._pt = new Xn(e._pt, t, n, 0, 0, di);
		return a.u = r, a.pr = -10, a.tween = i, e._props.push(n), 1;
	}
} }, pi = [
	1,
	0,
	0,
	1,
	0,
	0
], mi = {}, hi = function(e) {
	return e === "matrix(1, 0, 0, 1, 0, 0)" || e === "none" || !e;
}, gi = function(e) {
	var t = Jr(e, Vr);
	return hi(t) ? pi : t.substr(7).match(oe).map(Le);
}, _i = function(e, t) {
	var n = e._gsap || Pe(e), r = e.style, i = gi(e), a, o, s, c;
	return n.svg && e.getAttribute("transform") ? (s = e.transform.baseVal.consolidate().matrix, i = [
		s.a,
		s.b,
		s.c,
		s.d,
		s.e,
		s.f
	], i.join(",") === "1,0,0,1,0,0" ? pi : i) : (i === pi && !e.offsetParent && e !== pr && !n.svg && (s = r.display, r.display = "block", a = e.parentNode, a && (e.offsetParent || e.getBoundingClientRect().width) || (c = 1, o = e.nextElementSibling, pr.appendChild(e)), i = gi(e), s ? r.display = s : ni(e, "display"), c && (o ? a.insertBefore(e, o) : a ? a.appendChild(e) : pr.removeChild(e))), t && i.length > 6 ? [
		i[0],
		i[1],
		i[4],
		i[5],
		i[12],
		i[13]
	] : i);
}, vi = function(e, t, n, r, i, a) {
	var o = e._gsap, s = i || _i(e, !0), c = o.xOrigin || 0, l = o.yOrigin || 0, u = o.xOffset || 0, d = o.yOffset || 0, f = s[0], p = s[1], m = s[2], h = s[3], g = s[4], _ = s[5], v = t.split(" "), y = parseFloat(v[0]) || 0, b = parseFloat(v[1]) || 0, x, S, C, w;
	n ? s !== pi && (S = f * h - p * m) && (C = h / S * y + b * (-m / S) + (m * _ - h * g) / S, w = y * (-p / S) + f / S * b - (f * _ - p * g) / S, y = C, b = w) : (x = ei(e), y = x.x + (~v[0].indexOf("%") ? y / 100 * x.width : y), b = x.y + (~(v[1] || v[0]).indexOf("%") ? b / 100 * x.height : b)), r || r !== !1 && o.smooth ? (g = y - c, _ = b - l, o.xOffset = u + (g * f + _ * m) - g, o.yOffset = d + (g * p + _ * h) - _) : o.xOffset = o.yOffset = 0, o.xOrigin = y, o.yOrigin = b, o.smooth = !!r, o.origin = t, o.originIsAbsolute = !!n, e.style[z] = "0px 0px", a && (ri(a, o, "xOrigin", c, y), ri(a, o, "yOrigin", l, b), ri(a, o, "xOffset", u, o.xOffset), ri(a, o, "yOffset", d, o.yOffset)), e.setAttribute("data-svg-origin", y + " " + b);
}, yi = function(e, t) {
	var n = e._gsap || new bn(e);
	if ("x" in n && !t && !n.uncache) return n;
	var r = e.style, i = n.scaleX < 0, a = "px", o = "deg", s = getComputedStyle(e), c = Jr(e, z) || "0", l = u = d = h = g = _ = v = y = b = 0, u, d, p = m = 1, m, h, g, _, v, y, b, x, S, C, w, T, E, D, O, k, A, ee, te, ne, j, re, ie, ae, oe, se, ce, le;
	return n.svg = !!(e.getCTM && ti(e)), s.translate && ((s.translate !== "none" || s.scale !== "none" || s.rotate !== "none") && (r[Vr] = (s.translate === "none" ? "" : "translate3d(" + (s.translate + " 0 0").split(" ").slice(0, 3).join(", ") + ") ") + (s.rotate === "none" ? "" : "rotate(" + s.rotate + ") ") + (s.scale === "none" ? "" : "scale(" + s.scale.split(" ").join(",") + ") ") + (s[Vr] === "none" ? "" : s[Vr])), r.scale = r.rotate = r.translate = "none"), C = _i(e, n.svg), n.svg && (n.uncache ? (j = e.getBBox(), c = n.xOrigin - j.x + "px " + (n.yOrigin - j.y) + "px", ne = "") : ne = !t && e.getAttribute("data-svg-origin"), vi(e, ne || c, !!ne || n.originIsAbsolute, n.smooth !== !1, C)), x = n.xOrigin || 0, S = n.yOrigin || 0, C !== pi && (D = C[0], O = C[1], k = C[2], A = C[3], l = ee = C[4], u = te = C[5], C.length === 6 ? (p = Math.sqrt(D * D + O * O), m = Math.sqrt(A * A + k * k), h = D || O ? Sr(O, D) * br : 0, v = k || A ? Sr(k, A) * br + h : 0, v && (m *= Math.abs(Math.cos(v * xr))), n.svg && (l -= x - (x * D + S * k), u -= S - (x * O + S * A))) : (le = C[6], se = C[7], ie = C[8], ae = C[9], oe = C[10], ce = C[11], l = C[12], u = C[13], d = C[14], w = Sr(le, oe), g = w * br, w && (T = Math.cos(-w), E = Math.sin(-w), ne = ee * T + ie * E, j = te * T + ae * E, re = le * T + oe * E, ie = ee * -E + ie * T, ae = te * -E + ae * T, oe = le * -E + oe * T, ce = se * -E + ce * T, ee = ne, te = j, le = re), w = Sr(-k, oe), _ = w * br, w && (T = Math.cos(-w), E = Math.sin(-w), ne = D * T - ie * E, j = O * T - ae * E, re = k * T - oe * E, ce = A * E + ce * T, D = ne, O = j, k = re), w = Sr(O, D), h = w * br, w && (T = Math.cos(w), E = Math.sin(w), ne = D * T + O * E, j = ee * T + te * E, O = O * T - D * E, te = te * T - ee * E, D = ne, ee = j), g && Math.abs(g) + Math.abs(h) > 359.9 && (g = h = 0, _ = 180 - _), p = Le(Math.sqrt(D * D + O * O + k * k)), m = Le(Math.sqrt(te * te + le * le)), w = Sr(ee, te), v = Math.abs(w) > 2e-4 ? w * br : 0, b = ce ? 1 / (ce < 0 ? -ce : ce) : 0), n.svg && (ne = e.getAttribute("transform"), n.forceCSS = e.setAttribute("transform", "") || !hi(Jr(e, Vr)), ne && e.setAttribute("transform", ne))), Math.abs(v) > 90 && Math.abs(v) < 270 && (i ? (p *= -1, v += h <= 0 ? 180 : -180, h += h <= 0 ? 180 : -180) : (m *= -1, v += v <= 0 ? 180 : -180)), t ||= n.uncache, n.x = l - ((n.xPercent = l && (!t && n.xPercent || (Math.round(e.offsetWidth / 2) === Math.round(-l) ? -50 : 0))) ? e.offsetWidth * n.xPercent / 100 : 0) + a, n.y = u - ((n.yPercent = u && (!t && n.yPercent || (Math.round(e.offsetHeight / 2) === Math.round(-u) ? -50 : 0))) ? e.offsetHeight * n.yPercent / 100 : 0) + a, n.z = d + a, n.scaleX = Le(p), n.scaleY = Le(m), n.rotation = Le(h) + o, n.rotationX = Le(g) + o, n.rotationY = Le(_) + o, n.skewX = v + o, n.skewY = y + o, n.transformPerspective = b + a, (n.zOrigin = parseFloat(c.split(" ")[2]) || !t && n.zOrigin || 0) && (r[z] = bi(c)), n.xOffset = n.yOffset = 0, n.force3D = f.force3D, n.renderTransform = n.svg ? Di : Kr ? Ei : Si, n.uncache = 0, n;
}, bi = function(e) {
	return (e = e.split(" "))[0] + " " + e[1];
}, xi = function(e, t, n) {
	var r = F(t);
	return Le(parseFloat(t) + parseFloat(oi(e, "x", n + "px", r))) + r;
}, Si = function(e, t) {
	t.z = "0px", t.rotationY = t.rotationX = "0deg", t.force3D = 0, Ei(e, t);
}, Ci = "0deg", wi = "0px", Ti = ") ", Ei = function(e, t) {
	var n = t || this, r = n.xPercent, i = n.yPercent, a = n.x, o = n.y, s = n.z, c = n.rotation, l = n.rotationY, u = n.rotationX, d = n.skewX, f = n.skewY, p = n.scaleX, m = n.scaleY, h = n.transformPerspective, g = n.force3D, _ = n.target, v = n.zOrigin, y = "", b = g === "auto" && e && e !== 1 || g === !0;
	if (v && (u !== Ci || l !== Ci)) {
		var x = parseFloat(l) * xr, S = Math.sin(x), C = Math.cos(x), w;
		x = parseFloat(u) * xr, w = Math.cos(x), a = xi(_, a, S * w * -v), o = xi(_, o, -Math.sin(x) * -v), s = xi(_, s, C * w * -v + v);
	}
	h !== wi && (y += "perspective(" + h + Ti), (r || i) && (y += "translate(" + r + "%, " + i + "%) "), (b || a !== wi || o !== wi || s !== wi) && (y += s !== wi || b ? "translate3d(" + a + ", " + o + ", " + s + ") " : "translate(" + a + ", " + o + Ti), c !== Ci && (y += "rotate(" + c + Ti), l !== Ci && (y += "rotateY(" + l + Ti), u !== Ci && (y += "rotateX(" + u + Ti), (d !== Ci || f !== Ci) && (y += "skew(" + d + ", " + f + Ti), (p !== 1 || m !== 1) && (y += "scale(" + p + ", " + m + Ti), _.style[Vr] = y || "translate(0, 0)";
}, Di = function(e, t) {
	var n = t || this, r = n.xPercent, i = n.yPercent, a = n.x, o = n.y, s = n.rotation, c = n.skewX, l = n.skewY, u = n.scaleX, d = n.scaleY, f = n.target, p = n.xOrigin, m = n.yOrigin, h = n.xOffset, g = n.yOffset, _ = n.forceCSS, v = parseFloat(a), y = parseFloat(o), b, x, S, C, w;
	s = parseFloat(s), c = parseFloat(c), l = parseFloat(l), l && (l = parseFloat(l), c += l, s += l), s || c ? (s *= xr, c *= xr, b = Math.cos(s) * u, x = Math.sin(s) * u, S = Math.sin(s - c) * -d, C = Math.cos(s - c) * d, c && (l *= xr, w = Math.tan(c - l), w = Math.sqrt(1 + w * w), S *= w, C *= w, l && (w = Math.tan(l), w = Math.sqrt(1 + w * w), b *= w, x *= w)), b = Le(b), x = Le(x), S = Le(S), C = Le(C)) : (b = u, C = d, x = S = 0), (v && !~(a + "").indexOf("px") || y && !~(o + "").indexOf("px")) && (v = oi(f, "x", a, "px"), y = oi(f, "y", o, "px")), (p || m || h || g) && (v = Le(v + p - (p * b + m * S) + h), y = Le(y + m - (p * x + m * C) + g)), (r || i) && (w = f.getBBox(), v = Le(v + r / 100 * w.width), y = Le(y + i / 100 * w.height)), w = "matrix(" + b + "," + x + "," + S + "," + C + "," + v + "," + y + ")", f.setAttribute("transform", w), _ && (f.style[Vr] = w);
}, Oi = function(e, t, n, r, i) {
	var a = 360, o = T(i), s = parseFloat(i) * (o && ~i.indexOf("rad") ? br : 1) - r, c = r + s + "deg", l, u;
	return o && (l = i.split("_")[1], l === "short" && (s %= a, s !== s % (a / 2) && (s += s < 0 ? a : -a)), l === "cw" && s < 0 ? s = (s + a * Cr) % a - ~~(s / a) * a : l === "ccw" && s > 0 && (s = (s - a * Cr) % a - ~~(s / a) * a)), e._pt = u = new Xn(e._pt, t, n, r, s, kr), u.e = c, u.u = "deg", e._props.push(n), u;
}, ki = function(e, t) {
	for (var n in t) e[n] = t[n];
	return e;
}, Ai = function(e, t, n) {
	var r = ki({}, n._gsap), i = "perspective,force3D,transformOrigin,svgOrigin", a = n.style, o, s, c, l, u, d, f, p;
	for (s in r.svg ? (c = n.getAttribute("transform"), n.setAttribute("transform", ""), a[Vr] = t, o = yi(n, 1), ni(n, Vr), n.setAttribute("transform", c)) : (c = getComputedStyle(n)[Vr], a[Vr] = t, o = yi(n, 1), a[Vr] = c), yr) c = r[s], l = o[s], c !== l && i.indexOf(s) < 0 && (f = F(c), p = F(l), u = f === p ? parseFloat(c) : oi(n, s, c, p), d = parseFloat(l), e._pt = new Xn(e._pt, o, s, u, d - u, Or), e._pt.u = p || 0, e._props.push(s));
	ki(o, r);
};
Ie("padding,margin,Width,Radius", function(e, t) {
	var n = "Top", r = "Right", i = "Bottom", a = "Left", o = (t < 3 ? [
		n,
		r,
		i,
		a
	] : [
		n + a,
		n + r,
		i + r,
		i + a
	]).map(function(n) {
		return t < 2 ? e + n : "border" + n + e;
	});
	fi[t > 1 ? "border" + e : e] = function(e, t, n, r, i) {
		var a, s;
		if (arguments.length < 4) return a = o.map(function(t) {
			return si(e, t, n);
		}), s = a.join(" "), s.split(a[0]).length === 5 ? a[0] : s;
		a = (r + "").split(" "), s = {}, o.forEach(function(e, t) {
			return s[e] = a[t] = a[t] || a[(t - 1) / 2 | 0];
		}), e.init(t, s, i);
	};
});
var ji = {
	name: "css",
	register: Zr,
	targetTest: function(e) {
		return e.style && e.nodeType;
	},
	init: function(e, t, n, r, i) {
		var a = this._props, o = e.style, s = n.vars.startAt, c, l, u, d, p, m, h, g, _, v, y, b, x, S, C, w, E;
		for (h in mr || Zr(), this.styles = this.styles || Gr(e), w = this.styles.props, this.tween = n, t) if (h !== "autoRound" && (l = t[h], !(Oe[h] && En(h, t, n, r, e, i)))) {
			if (p = typeof l, m = fi[h], p === "function" && (l = l.call(n, r, e, i), p = typeof l), p === "string" && ~l.indexOf("random(") && (l = Ut(l)), m) m(this, e, h, l, n) && (C = 1);
			else if (h.substr(0, 2) === "--") c = (getComputedStyle(e).getPropertyValue(h) + "").trim(), l += "", nn.lastIndex = 0, nn.test(c) || (g = F(c), _ = F(l), _ ? g !== _ && (c = oi(e, h, c, _) + _) : g && (l += g)), this.add(o, "setProperty", c, l, r, i, 0, 0, h), a.push(h), w.push(h, 0, o[h]);
			else if (p !== "undefined") {
				if (s && h in s ? (c = typeof s[h] == "function" ? s[h].call(n, r, e, i) : s[h], T(c) && ~c.indexOf("random(") && (c = Ut(c)), F(c + "") || c === "auto" || (c += f.units[h] || F(si(e, h)) || ""), (c + "").charAt(1) === "=" && (c = si(e, h))) : c = si(e, h), d = parseFloat(c), v = p === "string" && l.charAt(1) === "=" && l.substr(0, 2), v && (l = l.substr(2)), u = parseFloat(l), h in Dr && (h === "autoAlpha" && (d === 1 && si(e, "visibility") === "hidden" && u && (d = 0), w.push("visibility", 0, o.visibility), ri(this, o, "visibility", d ? "inherit" : "hidden", u ? "inherit" : "hidden", !u)), h !== "scale" && h !== "transform" && (h = Dr[h], ~h.indexOf(",") && (h = h.split(",")[0]))), y = h in yr, y) {
					if (this.styles.save(h), E = l, p === "string" && l.substring(0, 6) === "var(--") {
						if (l = Jr(e, l.substring(4, l.indexOf(")"))), l.substring(0, 5) === "calc(") {
							var D = e.style.perspective;
							e.style.perspective = l, l = Jr(e, "perspective"), D ? e.style.perspective = D : ni(e, "perspective");
						}
						u = parseFloat(l);
					}
					if (b || (x = e._gsap, x.renderTransform && !t.parseTransform || yi(e, t.parseTransform), S = t.smoothOrigin !== !1 && x.smooth, b = this._pt = new Xn(this._pt, o, Vr, 0, 1, x.renderTransform, x, 0, -1), b.dep = 1), h === "scale") this._pt = new Xn(this._pt, x, "scaleY", x.scaleY, (v ? ze(x.scaleY, v + u) : u) - x.scaleY || 0, Or), this._pt.u = 0, a.push("scaleY", h), h += "X";
					else if (h === "transformOrigin") {
						w.push(z, 0, o[z]), l = ui(l), x.svg ? vi(e, l, 0, S, 0, this) : (_ = parseFloat(l.split(" ")[2]) || 0, _ !== x.zOrigin && ri(this, x, "zOrigin", x.zOrigin, _), ri(this, o, h, bi(c), bi(l)));
						continue;
					} else if (h === "svgOrigin") {
						vi(e, l, 1, S, 0, this);
						continue;
					} else if (h in mi) {
						Oi(this, x, h, d, v ? ze(d, v + l) : l);
						continue;
					} else if (h === "smoothOrigin") {
						ri(this, x, "smooth", x.smooth, l);
						continue;
					} else if (h === "force3D") {
						x[h] = l;
						continue;
					} else if (h === "transform") {
						Ai(this, l, e);
						continue;
					}
				} else h in o || (h = Xr(h) || h);
				if (y || (u || u === 0) && (d || d === 0) && !Er.test(l) && h in o) g = (c + "").substr((d + "").length), u ||= 0, _ = F(l) || (h in f.units ? f.units[h] : g), g !== _ && (d = oi(e, h, c, _)), this._pt = new Xn(this._pt, y ? x : o, h, d, (v ? ze(d, v + u) : u) - d, !y && (_ === "px" || h === "zIndex") && t.autoRound !== !1 ? Mr : Or), this._pt.u = _ || 0, y && E !== l ? (this._pt.b = c, this._pt.e = E, this._pt.r = jr) : g !== _ && _ !== "%" && (this._pt.b = c, this._pt.r = Ar);
				else if (h in o) ci.call(this, e, h, c, v ? v + l : l);
				else if (h in e) this.add(e, h, c || e[h], v ? v + l : l, r, i);
				else if (h !== "parseTransform") {
					N(h, l);
					continue;
				}
				y || (h in o ? w.push(h, 0, o[h]) : typeof e[h] == "function" ? w.push(h, 2, e[h]()) : w.push(h, 1, c || e[h])), a.push(h);
			}
		}
		C && Yn(this);
	},
	render: function(e, t) {
		if (t.tween._time || !_r()) for (var n = t._pt; n;) n.r(e, n.d), n = n._next;
		else t.styles.revert();
	},
	get: si,
	aliases: Dr,
	getSetter: function(e, t, n) {
		var r = Dr[t];
		return r && r.indexOf(",") < 0 && (t = r), t in yr && t !== z && (e._gsap.x || si(e, "x")) ? n && gr === n ? t === "scale" ? Rr : Lr : (gr = n || {}) && (t === "scale" ? zr : Br) : e.style && !O(e.style[t]) ? Fr : ~t.indexOf("-") ? Ir : Vn(e, t);
	},
	core: {
		_removeProperty: ni,
		_getMatrix: _i
	}
};
ur.utils.checkPrefix = Xr, ur.core.getStyleSaver = Gr, (function(e, t, n, r) {
	var i = Ie(e + "," + t + "," + n, function(e) {
		yr[e] = 1;
	});
	Ie(t, function(e) {
		f.units[e] = "deg", mi[e] = 1;
	}), Dr[i[13]] = e + "," + t, Ie(r, function(e) {
		var t = e.split(":");
		Dr[t[1]] = i[t[0]];
	});
})("x,y,z,scale,scaleX,scaleY,xPercent,yPercent", "rotation,rotationX,rotationY,skewX,skewY", "transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective", "0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY"), Ie("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective", function(e) {
	f.units[e] = "px";
}), ur.registerPlugin(ji);
// node_modules/gsap/index.js
var Mi = ur.registerPlugin(ji) || ur;
Mi.core.Tween;
// src/lib/boot.ts
var Ni = "bandexe-boot-seen-v1", Pi = {
	full: {
		codeAt: .25,
		floodAt: 1.4,
		kernelAt: 2.25,
		logoAt: 3.8,
		handoffAt: 6.9,
		end: 7.5
	},
	returning: {
		logoAt: 0,
		handoffAt: 1.4,
		end: 2
	}
}, Fi = {
	full: 1e4,
	returning: 4e3
}, Ii = (e) => `[${Math.max(0, e).toFixed(6).padStart(11)}]`, Li = [
	[/Edg\/(\d+)/, "EDGE"],
	[/OPR\/(\d+)/, "OPERA"],
	[/Firefox\/(\d+)/, "FIREFOX"],
	[/Chrome\/(\d+)/, "CHROME"],
	[/Version\/(\d+)[\d.]* .*Safari/, "SAFARI"]
], Ri = [
	[/iPhone|iPad/, "IOS"],
	[/Android/, "ANDROID"],
	[/CrOS/, "CHROMEOS"],
	[/Mac OS X|Macintosh/, "MACOS"],
	[/Windows/, "WINDOWS"],
	[/Linux/, "LINUX"]
];
function zi(e) {
	let t = Li.map(([t, n]) => [t.exec(e), n]).find(([e]) => e);
	return {
		browser: t ? `${t[1]} ${t[0][1]}` : "UNKNOWN",
		os: Ri.find(([t]) => t.test(e))?.[1] ?? "UNKNOWN"
	};
}
var Bi = 2e3, Vi = (e) => e === "suspended" || e === "interrupted" ? "gate" : "playing", Hi = (e, t) => e === "gate" && t !== "skip" ? "playing" : "done";
function Ui(e, t = !1, n = {}) {
	let r = !!n.waitForKey && !t, i = r ? "gate" : Vi(n.audioState ?? "running"), a, o = 0, s, c = !["suspended", "interrupted"].includes(n.audioState ?? "running"), l = () => {
		c || (c = !0, n.onUnlock?.());
	}, u = (e) => {
		clearTimeout(a), o = Date.now() + e, a = setTimeout(p, e);
	}, d = () => {
		i = "done", clearTimeout(a), document.removeEventListener("keydown", g, !0), document.removeEventListener("keyup", _, !0), window.removeEventListener("blur", v), document.removeEventListener("pointerdown", y, !0), document.removeEventListener("visibilitychange", b), window.removeEventListener("pageshow", b);
	}, f = () => {
		if (i !== "done") {
			d();
			try {
				localStorage.setItem(Ni, "1");
			} catch {}
			e();
		}
	}, p = () => {
		i === "gate" && r || (i === "gate" ? (i = "playing", u(Fi.full), n.onStart?.(!1)) : f());
	}, m = () => {
		l(), i = Hi(i, "gesture"), i === "playing" && (u(Fi.full), n.onStart?.(!0));
	}, h = (e) => e.target?.closest?.(".boot__skip"), g = (e) => {
		let t = !c;
		l(), e.preventDefault(), e.stopImmediatePropagation(), (s === void 0 || s !== e.code) && (s = e.code, !(i === "playing" && t) && (i === "gate" && (!h(e) || e.key !== "Enter" && e.key !== " ") ? m() : (Wi(e.code), f())));
	}, _ = (e) => {
		e.code === s && (e.preventDefault(), s = void 0);
	}, v = () => {
		s = void 0;
	}, y = (e) => {
		e.button !== 0 || e.isPrimary === !1 || h(e) || (l(), i === "gate" && (e.preventDefault(), e.stopImmediatePropagation(), m()));
	}, b = () => {
		Date.now() >= o && !(i === "gate" && r) && p();
	};
	return document.addEventListener("keydown", g, !0), document.addEventListener("keyup", _, !0), window.addEventListener("blur", v), document.addEventListener("pointerdown", y, !0), document.addEventListener("visibilitychange", b), window.addEventListener("pageshow", b), i === "gate" && r ? o = Infinity : u(i === "gate" ? Bi : Fi.full), i === "playing" && n.onStart?.(!1), {
		returning: !1,
		finish: f,
		dispose: d
	};
}
function Wi(e) {
	let t = (t) => {
		t.code === e && (t.preventDefault(), t.stopImmediatePropagation());
	}, n = (r) => {
		(r?.type !== "keyup" || r.code === e) && (document.removeEventListener("keydown", t, !0), document.removeEventListener("keyup", n, !0), window.removeEventListener("blur", n));
	};
	document.addEventListener("keydown", t, !0), document.addEventListener("keyup", n, !0), window.addEventListener("blur", n);
}
var Gi = "bandexe-skip-boot";
function Ki() {
	try {
		sessionStorage.setItem(Gi, "1");
	} catch {}
}
function qi() {
	try {
		let e = sessionStorage.getItem(Gi) === "1";
		return sessionStorage.removeItem(Gi), e;
	} catch {
		return !1;
	}
}
// shared/language.js
var Ji = [
	["en", "English"],
	["vi", "Tiếng Việt"],
	["zh", "中文"],
	["ko", "한국어"],
	["ja", "日本語"],
	["th", "ภาษาไทย"],
	["id", "Bahasa Indonesia"],
	["ar", "العربية"],
	["es", "Español"],
	["pt", "Português"],
	["hi", "हिन्दी"]
], Yi = (e) => Ji.some(([t]) => t === e);
function Xi(e = typeof navigator > "u" ? [] : navigator.languages || [navigator.language]) {
	for (let t of e) {
		let e = t.toLowerCase().split(/[-_]/)[0];
		if (Yi(e)) return e;
	}
	return "en";
}
// src/content/backgrounds.ts
var Zi = [
	{
		id: "ruled",
		band: 5,
		name: "Ruled Paper",
		tone: "light"
	},
	{
		id: "dots",
		band: 5,
		name: "Dot Grid",
		tone: "light"
	},
	{
		id: "graph",
		band: 5,
		name: "Graph Paper",
		tone: "light"
	},
	{
		id: "margin",
		band: 5,
		name: "Notebook Margin",
		tone: "light"
	},
	{
		id: "sticky",
		band: 5,
		name: "Sticky Notes",
		tone: "light"
	},
	{
		id: "stripes",
		band: 5,
		name: "Soft Stripes",
		tone: "light"
	},
	{
		id: "rain",
		band: 6,
		name: "Quiet Rain",
		tone: "dark"
	},
	{
		id: "commas",
		band: 6,
		name: "Drifting Commas",
		tone: "light"
	},
	{
		id: "fireflies",
		band: 6,
		name: "Fireflies",
		tone: "dark"
	},
	{
		id: "leaves",
		band: 6,
		name: "Autumn Leaves",
		tone: "light"
	},
	{
		id: "petals",
		band: 6,
		name: "Cherry Petals",
		tone: "light"
	},
	{
		id: "planes",
		band: 6,
		name: "Paper Planes",
		tone: "light"
	},
	{
		id: "hearts",
		band: 7,
		name: "Big Hearts",
		tone: "light"
	},
	{
		id: "papersky",
		band: 7,
		name: "Paper Sky",
		tone: "light"
	},
	{
		id: "cloudday",
		band: 7,
		name: "Cloud Day",
		tone: "light"
	},
	{
		id: "balloons",
		band: 7,
		name: "Balloons",
		tone: "light"
	},
	{
		id: "ink",
		band: 8,
		name: "Ink Clouds",
		tone: "dark"
	},
	{
		id: "tide",
		band: 8,
		name: "Slow Tide",
		tone: "light"
	},
	{
		id: "aurora",
		band: 8,
		name: "Aurora",
		tone: "dark"
	},
	{
		id: "snow",
		band: 8,
		name: "Snow Cabin",
		tone: "dark"
	},
	{
		id: "moon",
		band: 9,
		name: "Moonrise",
		tone: "dark"
	},
	{
		id: "constellation",
		band: 9,
		name: "Heart Constellation",
		tone: "dark"
	},
	{
		id: "jelly",
		band: 9,
		name: "Jellyfish Sea",
		tone: "dark"
	},
	{
		id: "city",
		band: 9,
		name: "City Windows",
		tone: "dark"
	}
], Qi = [
	{
		id: "stub",
		band: 5,
		helper: "coach",
		name: "Stub",
		line: "Worn down from practice.",
		svg: "<svg class=\"mascot\" data-mascot=\"stub\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"21\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"34\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"m-body\" d=\"M32 3 L43 21 V54 C43 56 41 57 39 57 H25 C23 57 21 56 21 54 V21 Z\"/><path class=\"m-tip\" d=\"M32 3 L36.5 10.5 H27.5 Z\"/><path class=\"m-line m-face\" d=\"M21 21 H43\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"24.5\" y=\"29.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"27.70\" cy=\"31.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"34.5\" y=\"29.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"37.70\" cy=\"31.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M28.5 43 Q32 45.5 35.5 43\"/><path class=\"m-line m-hand\" d=\"M21 39 L14 43 L11 38\"/><path class=\"m-line m-hand\" d=\"M43 39 L50 43 L53 38\"/></svg>"
	},
	{
		id: "rubs",
		band: 5,
		helper: "coach",
		name: "Rubs",
		line: "Fixes one mistake at a time.",
		svg: "<svg class=\"mascot\" data-mascot=\"rubs\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"19\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"36\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body\" x=\"10\" y=\"16\" width=\"44\" height=\"41\" rx=\"9\"/><path class=\"m-line m-face\" d=\"M10 30 H54\"/><path class=\"m-line m-face\" d=\"M10 26 H54\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"22.5\" y=\"36.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"25.70\" cy=\"38.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.5\" y=\"36.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"39.70\" cy=\"38.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M28 49 H36\"/><path class=\"m-line m-hand\" d=\"M13 39 L7 43 L4 38\"/><path class=\"m-line m-hand\" d=\"M51 39 L57 43 L60 38\"/></svg>"
	},
	{
		id: "ruly",
		band: 5,
		helper: "coach",
		name: "Ruly",
		line: "Keeps your lines straight.",
		svg: "<svg class=\"mascot\" data-mascot=\"ruly\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"20\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"35\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body\" x=\"17\" y=\"3\" width=\"30\" height=\"53\" rx=\"3\"/><path class=\"m-line m-face\" d=\"M17 11 H25 M17 19 H29 M17 27 H25 M17 35 H29 M17 43 H25 M17 51 H29\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"31.2\" y=\"22.0\" width=\"3.6\" height=\"6\" rx=\"1.8\"/><circle class=\"m-cut\" cx=\"33.50\" cy=\"23.80\" r=\"1.1\"/><rect class=\"m-eye\" x=\"39.2\" y=\"22.0\" width=\"3.6\" height=\"6\" rx=\"1.8\"/><circle class=\"m-cut\" cx=\"41.50\" cy=\"23.80\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M34 34 Q37 36.5 40 34\"/><path class=\"m-line m-hand\" d=\"M17 36 L10 40 L7 35\"/><path class=\"m-line m-hand\" d=\"M47 36 L54 40 L57 35\"/></svg>"
	},
	{
		id: "dot",
		band: 5,
		helper: "ideas",
		name: "Dot",
		line: "Knows when to stop.",
		svg: "<svg class=\"mascot\" data-mascot=\"dot\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"21\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"34\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><circle class=\"m-body\" cx=\"32\" cy=\"35\" r=\"21\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.0\" y=\"29.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"26.20\" cy=\"31.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.0\" y=\"29.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"39.20\" cy=\"31.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M28.5 42.5 Q32 45 35.5 42.5\"/><path class=\"m-line m-hand\" d=\"M13 39 L7 43 L4 38\"/><path class=\"m-line m-hand\" d=\"M51 39 L57 43 L60 38\"/></svg>"
	},
	{
		id: "semi",
		band: 5,
		helper: "ideas",
		name: "Semi",
		line: "Joins two thoughts.",
		svg: "<svg class=\"mascot\" data-mascot=\"semi\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"15\" y=\"50\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"33\" y=\"50\" width=\"9\" height=\"6\" rx=\"3\"/><circle class=\"m-body\" cx=\"32\" cy=\"17\" r=\"13\"/><path class=\"m-body\" d=\"M32 34 C43 34 49 39 49 45 C49 53 42 58 33 62 L29 58 C32 56 34 54 35 52 C23 53 15 49 15 43 C15 38 22 34 32 34 Z\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"24.5\" y=\"12.75\" width=\"4\" height=\"6.5\" rx=\"2.0\"/><circle class=\"m-cut\" cx=\"27.06\" cy=\"14.70\" r=\"1.1\"/><rect class=\"m-eye\" x=\"35.5\" y=\"12.75\" width=\"4\" height=\"6.5\" rx=\"2.0\"/><circle class=\"m-cut\" cx=\"38.06\" cy=\"14.70\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M26 43 Q32 47 38 43\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "clip",
		band: 5,
		helper: "synonyms",
		name: "Clip",
		line: "Keeps your paragraphs together.",
		svg: "<svg class=\"mascot\" data-mascot=\"clip\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"21\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"34\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body\" x=\"14\" y=\"24\" width=\"36\" height=\"33\" rx=\"12\"/><path class=\"m-line\" d=\"M25 25 V10 C25 4 37 4 37 10 V21 C37 24.5 31 24.5 31 21 V13\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.0\" y=\"34.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"26.20\" cy=\"36.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.0\" y=\"34.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"39.20\" cy=\"36.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M28.5 47 Q32 49.5 35.5 47\"/><path class=\"m-line m-hand\" d=\"M13 39 L7 43 L4 38\"/><path class=\"m-line m-hand\" d=\"M51 39 L57 43 L60 38\"/></svg>"
	},
	{
		id: "tick",
		band: 6,
		helper: "coach",
		name: "Tick",
		line: "Forty minutes. Starts now.",
		svg: "<svg class=\"mascot\" data-mascot=\"tick\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"20\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"35\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-tip\" x=\"27\" y=\"3\" width=\"10\" height=\"6\" rx=\"2\"/><path class=\"m-line\" d=\"M32 9 V16\"/><path class=\"m-line\" d=\"M48 15 L52 11\"/><circle class=\"m-body\" cx=\"32\" cy=\"36\" r=\"21\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"22.75\" y=\"27.5\" width=\"4.5\" height=\"7\" rx=\"2.25\"/><circle class=\"m-cut\" cx=\"25.63\" cy=\"29.60\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.75\" y=\"27.5\" width=\"4.5\" height=\"7\" rx=\"2.25\"/><circle class=\"m-cut\" cx=\"39.63\" cy=\"29.60\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M32 41 V49 M32 41 L38 45\"/><path class=\"m-line m-face\" d=\"M32 18.5 V21 M32 50.5 V53.5 M14.5 36 H17 M47 36 H49.5\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "draft",
		band: 6,
		helper: "ideas",
		name: "Draft",
		line: "Never the final version.",
		svg: "<svg class=\"mascot\" data-mascot=\"draft\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"19\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"36\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"m-body\" d=\"M12 8 H40 L52 20 V57 H12 Z\"/><path class=\"m-line\" d=\"M40 8 V20 H52\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"21.5\" y=\"25.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"24.70\" cy=\"27.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"35.5\" y=\"25.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"38.70\" cy=\"27.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M19 40 H45 M19 46 H45 M19 52 H34\"/><path class=\"m-line m-hand\" d=\"M12 37 L6 41 L3 36\"/><path class=\"m-line m-hand\" d=\"M52 37 L58 41 L61 36\"/></svg>"
	},
	{
		id: "bulb",
		band: 6,
		helper: "ideas",
		name: "Bulb",
		line: "Lights up mid-sentence.",
		svg: "<svg class=\"mascot\" data-mascot=\"bulb\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"21\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"34\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"m-line\" d=\"M32 2 V5 M12 10 L14.5 12.5 M52 10 L49.5 12.5 M5 28 H8.5 M59 28 H55.5\"/><path class=\"m-body\" d=\"M32 8 C43 8 50 16 50 26 C50 34 45 38 42 43 V48 H22 V43 C19 38 14 34 14 26 C14 16 21 8 32 8 Z\"/><rect class=\"m-tip\" x=\"23\" y=\"48\" width=\"18\" height=\"7\" rx=\"2\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.0\" y=\"21.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"26.20\" cy=\"23.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.0\" y=\"21.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"39.20\" cy=\"23.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M28.5 34 Q32 36.5 35.5 34\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "comma",
		band: 6,
		helper: "synonyms",
		name: "Comma",
		line: "Always asks you to pause.",
		svg: "<svg class=\"mascot\" data-mascot=\"comma\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body\" x=\"15\" y=\"46\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"m-body\" d=\"M32 11 C45 11 52 20 52 31 C52 46 42 55 30 60 C29 60 28.5 59 29.5 58 C33 55 35 52.5 35.5 50 C22 51 13 42 13 31 C13 20 20 11 32 11 Z\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.5\" y=\"25.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"26.70\" cy=\"27.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.5\" y=\"25.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"39.70\" cy=\"27.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M29 38 Q32.5 40.5 36 38\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-foot\" d=\"\"/><path class=\"m-foot\" d=\"\"/></svg>"
	},
	{
		id: "quote",
		band: 6,
		helper: "synonyms",
		name: "Quote",
		line: "Copies your errors exactly.",
		svg: "<svg class=\"mascot\" data-mascot=\"quote\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"20\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"35\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"m-body\" d=\"M12 14 H29 V33 C29 42 23 48 15 51 L13 46 C18 44 20.5 41 21 37 H12 Z\"/><path class=\"m-body\" d=\"M35 14 H52 V33 C52 42 46 48 38 51 L36 46 C41 44 43.5 41 44 37 H35 Z\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"18.25\" y=\"21.5\" width=\"4.5\" height=\"7\" rx=\"2.25\"/><circle class=\"m-cut\" cx=\"21.13\" cy=\"23.60\" r=\"1.1\"/><rect class=\"m-eye\" x=\"41.25\" y=\"21.5\" width=\"4.5\" height=\"7\" rx=\"2.25\"/><circle class=\"m-cut\" cx=\"44.13\" cy=\"23.60\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M17.5 32 Q20.5 34 23.5 32\"/><path class=\"m-line m-face\" d=\"M40.5 32 Q43.5 34 46.5 32\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "chatty",
		band: 6,
		helper: "synonyms",
		name: "Chatty",
		line: "Never says said twice.",
		svg: "<svg class=\"mascot\" data-mascot=\"chatty\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"20\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"35\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"m-body\" d=\"M14 8 H50 C55 8 58 11 58 16 V38 C58 43 55 46 50 46 H30 L18 56 V46 H14 C9 46 6 43 6 38 V16 C6 11 9 8 14 8 Z\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"20.5\" y=\"17.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"23.70\" cy=\"19.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"38.5\" y=\"17.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"41.70\" cy=\"19.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M16 33 H26 M30 33 H34 M38 33 H48\"/><path class=\"m-line m-face\" d=\"M22 38.5 H42\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "hedge",
		band: 7,
		helper: "coach",
		name: "Hedge",
		line: "It would appear that it tends to.",
		svg: "<svg class=\"mascot\" data-mascot=\"hedge\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"20\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"35\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"m-tip\" d=\"M9 40 L3 34 L10 33 L6 25 L14 27 L13 18 L20 22 L22 13 L28 19 L32 10 L36 19 L42 13 L44 22 L51 18 L50 27 L58 25 L54 33 L61 34 L55 40 Z\"/><path class=\"m-body\" d=\"M12 44 C12 31 20 25 32 25 C44 25 52 31 52 44 C52 53 44 57 32 57 C20 57 12 53 12 44 Z\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.0\" y=\"34.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"26.20\" cy=\"36.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.0\" y=\"34.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"39.20\" cy=\"36.40\" r=\"1.1\"/></g><path class=\"m-tip\" d=\"M30 44 H34 L32 47 Z\"/><path class=\"m-line m-face\" d=\"M27 50 Q32 53 37 50\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "blot",
		band: 7,
		helper: "ideas",
		name: "Blot",
		line: "Spills ideas everywhere.",
		svg: "<svg class=\"mascot\" data-mascot=\"blot\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"21\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"34\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"m-body\" d=\"M32 3 C36 14 52 24 52 39 C52 50 43 57 32 57 C21 57 12 50 12 39 C12 24 28 14 32 3 Z\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.0\" y=\"33.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"26.20\" cy=\"35.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.0\" y=\"33.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"39.20\" cy=\"35.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M28.5 46 Q32 48.5 35.5 46\"/><circle class=\"m-tip\" cx=\"55\" cy=\"16\" r=\"2.5\"/><circle class=\"m-tip\" cx=\"9\" cy=\"22\" r=\"1.8\"/><path class=\"m-line m-hand\" d=\"M13 44 L7 47\"/><path class=\"m-line m-hand\" d=\"M51 44 L57 47\"/></svg>"
	},
	{
		id: "piey",
		band: 7,
		helper: "ideas",
		name: "Piey",
		line: "Always adds up to 100%.",
		svg: "<svg class=\"mascot\" data-mascot=\"piey\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"20\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"35\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><circle class=\"m-body\" cx=\"32\" cy=\"34\" r=\"22\"/><path class=\"m-tip\" d=\"M32 34 V12 A22 22 0 0 1 53 29 Z\"/><path class=\"m-line m-face\" d=\"M32 34 L12 44\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"18.75\" y=\"25.5\" width=\"4.5\" height=\"7\" rx=\"2.25\"/><circle class=\"m-cut\" cx=\"21.63\" cy=\"27.60\" r=\"1.1\"/><rect class=\"m-eye\" x=\"32.75\" y=\"25.5\" width=\"4.5\" height=\"7\" rx=\"2.25\"/><circle class=\"m-cut\" cx=\"35.63\" cy=\"27.60\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M38 44 Q42 47 46 44\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "linko",
		band: 7,
		helper: "synonyms",
		name: "Linko",
		line: "However. Moreover. Therefore.",
		svg: "<svg class=\"mascot\" data-mascot=\"linko\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"19\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"36\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body\" x=\"6\" y=\"15\" width=\"30\" height=\"42\" rx=\"15\"/><rect class=\"m-body\" x=\"28\" y=\"15\" width=\"30\" height=\"42\" rx=\"15\"/><path class=\"m-line\" d=\"M36 30 V42 M28 30 V42\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"14.5\" y=\"28.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"17.70\" cy=\"30.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"44.5\" y=\"28.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"47.70\" cy=\"30.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M13 43 Q17 46 21 43\"/><path class=\"m-line m-face\" d=\"M43 43 Q47 46 51 43\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "thes",
		band: 7,
		helper: "synonyms",
		name: "Thes",
		line: "Has eleven words for good.",
		svg: "<svg class=\"mascot\" data-mascot=\"thes\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"19\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"36\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"m-body\" d=\"M6 13 C14 9 26 9 32 14 C38 9 50 9 58 13 V54 C50 50 38 50 32 56 C26 50 14 50 6 54 Z\"/><path class=\"m-line\" d=\"M32 14 V56\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"17.5\" y=\"24.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"20.70\" cy=\"26.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"41.5\" y=\"24.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"44.70\" cy=\"26.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M13 39 H26 M13 44 H26 M38 39 H51 M38 44 H51\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "hoot",
		band: 8,
		helper: "coach",
		name: "Hoot",
		line: "Watches the exam hall.",
		svg: "<svg class=\"mascot\" data-mascot=\"hoot\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"20\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"35\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><g class=\"sx-swivel\"><path class=\"m-tip\" d=\"M14 11 L24 17 L13 21 Z\"/><path class=\"m-tip\" d=\"M50 11 L40 17 L51 21 Z\"/><path class=\"m-body\" d=\"M12 36 C12 21 20 13 32 13 C44 13 52 21 52 36 C52 49 44 57 32 57 C20 57 12 49 12 36 Z\"/><circle class=\"sx-lens m-line m-face\" cx=\"23.5\" cy=\"31\" r=\"8\"/><circle class=\"sx-lens m-line m-face\" cx=\"40.5\" cy=\"31\" r=\"8\"/><path class=\"m-line m-face\" d=\"M31.5 31 H32.5\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"21.5\" y=\"28.0\" width=\"4\" height=\"6\" rx=\"2.0\"/><circle class=\"m-cut\" cx=\"24.06\" cy=\"29.80\" r=\"1.1\"/><rect class=\"m-eye\" x=\"38.5\" y=\"28.0\" width=\"4\" height=\"6\" rx=\"2.0\"/><circle class=\"m-cut\" cx=\"41.06\" cy=\"29.80\" r=\"1.1\"/></g><path class=\"m-tip\" d=\"M32 39 L35.5 43 L32 47 L28.5 43 Z\"/><path class=\"m-line m-face\" d=\"M22 51 L24 53 L26 51 M30 53 L32 55 L34 53 M38 51 L40 53 L42 51\"/></g><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "sandy",
		band: 8,
		helper: "coach",
		name: "Sandy",
		line: "Sixty minutes, two tasks.",
		svg: "<svg class=\"mascot\" data-mascot=\"sandy\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"20\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"35\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><g class=\"sx-flip\"><path class=\"m-tip\" d=\"M12 4 H52 V10 H12 Z\"/><path class=\"m-tip\" d=\"M12 48 H52 V54 H12 Z\"/><path class=\"m-body\" d=\"M16 10 H48 V16 C48 24 38 26 38 29 C38 32 48 34 48 42 V48 H16 V42 C16 34 26 32 26 29 C26 26 16 24 16 16 Z\"/><rect class=\"m-tip sx-grain\" x=\"31.5\" y=\"28\" width=\"1\" height=\"8\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"24.0\" y=\"13.75\" width=\"4\" height=\"6.5\" rx=\"2.0\"/><circle class=\"m-cut\" cx=\"26.56\" cy=\"15.70\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.0\" y=\"13.75\" width=\"4\" height=\"6.5\" rx=\"2.0\"/><circle class=\"m-cut\" cx=\"38.56\" cy=\"15.70\" r=\"1.1\"/></g><path class=\"sx-sand m-tip\" d=\"M22 48 C24 41 29 39 32 36 C35 39 40 41 42 48 Z\"/><path class=\"m-line m-hand\" d=\"M16 30 L9 34\"/><path class=\"m-line m-hand\" d=\"M48 30 L55 34\"/></g></svg>"
	},
	{
		id: "barry",
		band: 8,
		helper: "ideas",
		name: "Barry",
		line: "Reads every chart twice.",
		svg: "<svg class=\"mascot\" data-mascot=\"barry\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"19\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"36\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"m-line\" d=\"M32 14 V7\"/><circle class=\"sx-blink m-tip\" cx=\"32\" cy=\"5\" r=\"3\"/><rect class=\"m-body\" x=\"9\" y=\"14\" width=\"46\" height=\"43\" rx=\"8\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"21.5\" y=\"21.5\" width=\"5\" height=\"7\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"24.70\" cy=\"23.60\" r=\"1.1\"/><rect class=\"m-eye\" x=\"37.5\" y=\"21.5\" width=\"5\" height=\"7\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"40.70\" cy=\"23.60\" r=\"1.1\"/></g><rect class=\"sx-bar sx-b1 m-tip\" x=\"16\" y=\"42\" width=\"7\" height=\"10\"/><rect class=\"sx-bar sx-b2 m-tip\" x=\"25\" y=\"37\" width=\"7\" height=\"15\"/><rect class=\"sx-bar sx-b3 m-tip\" x=\"34\" y=\"33\" width=\"7\" height=\"19\"/><rect class=\"sx-bar sx-b4 m-tip\" x=\"43\" y=\"39\" width=\"6\" height=\"13\"/><path class=\"m-line m-face\" d=\"M14 52.5 H51\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "mappy",
		band: 8,
		helper: "ideas",
		name: "Mappy",
		line: "To the north, a new library.",
		svg: "<svg class=\"mascot\" data-mascot=\"mappy\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"19\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"36\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"m-body\" d=\"M8 19 L24 14 L40 19 L56 14 V52 L40 57 L24 52 L8 57 Z\"/><path class=\"m-line\" d=\"M24 14 V52 M40 19 V57\"/><ellipse class=\"m-line sx-ring\" cx=\"47\" cy=\"26\" rx=\"6\" ry=\"1.8\"/><g class=\"sx-pin\"><path class=\"m-tip\" d=\"M47 3 C52 3 55 7 55 11 C55 16 49 21 47 25 C45 21 39 16 39 11 C39 7 42 3 47 3 Z\"/><circle class=\"m-cut\" cx=\"47\" cy=\"11\" r=\"2.4\"/></g><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"14.5\" y=\"29.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"17.70\" cy=\"31.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"28.5\" y=\"29.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"31.70\" cy=\"31.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M19 45 Q24 48 29 45\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "gradu",
		band: 8,
		helper: "synonyms",
		name: "Gradu",
		line: "Passed with distinction.",
		svg: "<svg class=\"mascot\" data-mascot=\"gradu\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"20\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"35\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><circle class=\"m-body\" cx=\"32\" cy=\"38\" r=\"19\"/><path class=\"m-line\" d=\"M18 22 V29 C24 33 40 33 46 29 V22\"/><g class=\"sx-cap\"><path class=\"m-tip\" d=\"M32 7 L58 17 L32 27 L6 17 Z\"/><g class=\"sx-tassel\"><path class=\"m-line\" d=\"M54 18 V31\"/><circle class=\"m-tip\" cx=\"54\" cy=\"33\" r=\"2.6\"/></g></g><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.0\" y=\"35.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"26.20\" cy=\"37.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.0\" y=\"35.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"39.20\" cy=\"37.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M28.5 47.5 Q32 50 35.5 47.5\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/></svg>"
	},
	{
		id: "inky",
		band: 8,
		helper: "synonyms",
		name: "Inky",
		line: "Never repeats a word.",
		svg: "<svg class=\"mascot\" data-mascot=\"inky\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"17\" y=\"50\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"38\" y=\"50\" width=\"9\" height=\"6\" rx=\"3\"/><g class=\"sx-write\"><path class=\"m-body\" d=\"M32 62 L19 42 V16 C19 8 25 3 32 3 C39 3 45 8 45 16 V42 Z\"/><path class=\"m-tip\" d=\"M32 62 L27 53 H37 Z\"/><path class=\"m-line m-face\" d=\"M19 39 H45 M32 53 V45\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.5\" y=\"17.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"26.70\" cy=\"19.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"35.5\" y=\"17.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"38.70\" cy=\"19.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M28.5 30 Q32 32.5 35.5 30\"/></g><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-line sx-ink\" pathLength=\"100\" d=\"M6 63 Q12 60 18 63 T30 63 T42 63 T58 63\"/></svg>"
	},
	{
		id: "scan",
		band: 9,
		helper: "coach",
		name: "Scan",
		line: "The essay spider, as a pet.",
		svg: "<svg class=\"mascot\" data-mascot=\"scan\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><path class=\"sx-la m-line m-hand\" d=\"M21 28 L10 16 L3 26\"/><path class=\"sx-lb m-line\" d=\"M19 36 L6 32 L1 44\"/><path class=\"sx-la m-line\" d=\"M21 44 L10 48 L6 60\"/><path class=\"sx-lb m-line m-hand\" d=\"M43 28 L54 16 L61 26\"/><path class=\"sx-la m-line\" d=\"M45 36 L58 32 L63 44\"/><path class=\"sx-lb m-line\" d=\"M43 44 L54 48 L58 60\"/><circle class=\"m-body\" cx=\"32\" cy=\"36\" r=\"16\"/><circle class=\"m-tip\" cx=\"32\" cy=\"14\" r=\"2.4\"/><g class=\"sx-scurry\"><path class=\"m-line\" d=\"M32 16.5 V20\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.75\" y=\"29.5\" width=\"4.5\" height=\"7\" rx=\"2.25\"/><circle class=\"m-cut\" cx=\"26.63\" cy=\"31.60\" r=\"1.1\"/><rect class=\"m-eye\" x=\"35.75\" y=\"29.5\" width=\"4.5\" height=\"7\" rx=\"2.25\"/><circle class=\"m-cut\" cx=\"38.63\" cy=\"31.60\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M18 43 H46\"/><path class=\"sx-sweep m-tip\" d=\"M26 43 H38 V45 H26 Z\"/><path class=\"m-foot\" d=\"\"/><path class=\"m-foot\" d=\"\"/></g><rect class=\"sx-beam\" x=\"4\" y=\"20\" width=\"56\" height=\"1.6\"/></svg>"
	},
	{
		id: "cert",
		band: 9,
		helper: "coach",
		name: "Cert",
		line: "The whole point, framed.",
		svg: "<svg class=\"mascot\" data-mascot=\"cert\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><path class=\"sx-rib m-tip\" d=\"M21 44 L14 62 L22 57 L27 62 L31 48 Z\"/><path class=\"sx-rib sx-rib2 m-tip\" d=\"M43 44 L50 62 L42 57 L37 62 L33 48 Z\"/><path class=\"m-body\" d=\"M8 8 H56 V48 H8 Z\"/><rect class=\"m-line\" x=\"12\" y=\"12\" width=\"40\" height=\"32\"/><rect class=\"sx-shine\" x=\"14\" y=\"13\" width=\"5\" height=\"30\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"22.5\" y=\"20.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"25.70\" cy=\"22.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.5\" y=\"20.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"39.70\" cy=\"22.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M28 31 Q32 34 36 31\"/><path class=\"m-line m-face\" d=\"M18 38 H46\"/><circle class=\"sx-stamp m-tip\" cx=\"32\" cy=\"48\" r=\"6\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-foot\" d=\"\"/><path class=\"m-foot\" d=\"\"/></svg>"
	},
	{
		id: "nine",
		band: 9,
		helper: "ideas",
		name: "Nine",
		line: "The band nobody gets easily.",
		svg: "<svg class=\"mascot\" data-mascot=\"nine\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body\" x=\"15\" y=\"46\" width=\"9\" height=\"6\" rx=\"3\"/><path class=\"sx-crown m-tip\" d=\"M15 16 L15 3 L24 9 L32 1 L40 9 L49 3 L49 16 Z\"/><g class=\"sx-pulse\"><path class=\"m-body\" d=\"M32 16 C45 16 53 24 53 33 C53 47 44 55 33 60 L27 55 C33 52 37 49 39 46 C36 48 33 48 30 48 C19 48 11 42 11 32 C11 23 19 16 32 16 Z\"/><circle class=\"m-line m-face\" cx=\"30\" cy=\"32\" r=\"10.5\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.5\" y=\"28.75\" width=\"4\" height=\"6.5\" rx=\"2.0\"/><circle class=\"m-cut\" cx=\"26.06\" cy=\"30.70\" r=\"1.1\"/><rect class=\"m-eye\" x=\"32.5\" y=\"28.75\" width=\"4\" height=\"6.5\" rx=\"2.0\"/><circle class=\"m-cut\" cx=\"35.06\" cy=\"30.70\" r=\"1.1\"/></g><path class=\"sx-blink m-line\" d=\"M4 28 L1 26 M5 38 L1 39 M60 44 L63 46\"/></g><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-foot\" d=\"\"/><path class=\"m-foot\" d=\"\"/></svg>"
	},
	{
		id: "globe",
		band: 9,
		helper: "ideas",
		name: "Globe",
		line: "Every topic, every country.",
		svg: "<svg class=\"mascot\" data-mascot=\"globe\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect class=\"m-body m-foot\" x=\"20\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><rect class=\"m-body m-foot\" x=\"35\" y=\"54\" width=\"9\" height=\"6\" rx=\"3\"/><circle class=\"m-body\" cx=\"32\" cy=\"29\" r=\"24\"/><path class=\"m-line m-face\" d=\"M8 29 H16 M48 29 H56 M32 5 C24 12 20 20 20 22 M32 5 C40 12 44 20 44 22\"/><ellipse class=\"m-line m-face sx-merid\" cx=\"32\" cy=\"29\" rx=\"16\" ry=\"23.5\"/><ellipse class=\"m-line m-face sx-merid sx-merid2\" cx=\"32\" cy=\"29\" rx=\"16\" ry=\"23.5\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.0\" y=\"23.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"26.20\" cy=\"25.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.0\" y=\"23.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"39.20\" cy=\"25.40\" r=\"1.1\"/></g><path class=\"m-line m-face\" d=\"M28.5 37 Q32 39.5 35.5 37\"/><path class=\"m-line m-face\" d=\"M15 44 C24 41 40 41 49 44\"/><path class=\"m-line\" d=\"M32 53 V57 M22 58 H42\"/><path class=\"m-hand\" d=\"\"/><path class=\"m-hand\" d=\"\"/><g class=\"sx-orbit\"><circle class=\"m-tip\" cx=\"61\" cy=\"29\" r=\"2.6\"/></g></svg>"
	},
	{
		id: "zero",
		band: 9,
		helper: "synonyms",
		name: "Zero",
		line: "Zero errors. Spooky.",
		svg: "<svg class=\"mascot\" data-mascot=\"zero\" viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><path class=\"sx-blink m-tip\" d=\"M6 22 L9 26 M58 22 L55 26 M4 36 H8 M60 36 H56\"/><g class=\"sx-ghost\"><path class=\"m-body\" d=\"M12 58 V30 C12 17 20 8 32 8 C44 8 52 17 52 30 V58 L45 52 L38.5 58 L32 52 L25.5 58 L19 52 Z\"/><g class=\"m-eyes\"><rect class=\"m-eye\" x=\"23.0\" y=\"24.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"26.20\" cy=\"26.40\" r=\"1.1\"/><rect class=\"m-eye\" x=\"36.0\" y=\"24.0\" width=\"5\" height=\"8\" rx=\"2.5\"/><circle class=\"m-cut\" cx=\"39.20\" cy=\"26.40\" r=\"1.1\"/></g><ellipse class=\"sx-oh m-line\" cx=\"32\" cy=\"40\" rx=\"3.6\" ry=\"5\"/><path class=\"m-line m-hand\" d=\"M12 37 L6 33\"/><path class=\"m-line m-hand\" d=\"M52 37 L58 33\"/><path class=\"m-foot\" d=\"\"/><path class=\"m-foot\" d=\"\"/></g></svg>"
	}
], $i = (e) => Math.round(e * 100) / 100;
function ea(e, t, n, r = 5, i = 8) {
	let a = (e) => `<rect class="m-eye" x="${$i(e - r / 2)}" y="${$i(n - i / 2)}" width="${r}" height="${i}" rx="${$i(r / 2)}"/><circle class="m-cut" cx="${$i(e + r * .14)}" cy="${$i(n - i * .2)}" r="1.1"/>`;
	return `<g class="m-eyes">${a(e)}${a(t)}</g>`;
}
function ta(e, t, n = 54) {
	let r = (e) => `<rect class="m-body m-foot" x="${e}" y="${n}" width="9" height="6" rx="3"/>`;
	return `<g class="m-feet">${r(e)}${r(t)}</g>`;
}
function na() {
	return "<path class=\"m-line m-hand\" d=\"M15 39 L8 43 L5 38\"/><path class=\"m-line m-hand\" d=\"M49 39 L56 43 L59 38\"/>";
}
var ra = (e) => `<svg class="mascot" data-mascot="${e}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">`;
ra("coach") + ta(20, 35) + "" + ea(25.5, 38.5, 36.5) + na(), ra("synonyms") + ta(18, 33) + "" + ea(23.5, 36.5, 33) + na(), ra("ideas") + ta(20, 35) + "" + ea(25.5, 38.5, 37.5) + na();
// src/lib/prefs.ts
var B = [
	["blur", "Blur"],
	["clear", "See-through"],
	["solid", "Solid"]
], V = [
	["mono", "Mono (default)"],
	["matrix", "Matrix Green"],
	["amber", "Amber CRT"],
	["cyan", "Cyan HUD"],
	["paper", "Paper (light)"]
], ia = "bandexe-prefs", aa = {
	panelLook: "blur",
	uiLanguage: Xi(),
	feedbackLanguage: Xi(),
	theme: "mono",
	scanlines: "off",
	glow: "off",
	mascots: "on",
	boot: "on",
	sound: "on",
	typingSounds: "off",
	reduced: "off",
	edSize: "17"
};
function oa() {
	let e = Xi(), t = {
		...aa,
		uiLanguage: e,
		feedbackLanguage: e
	};
	try {
		let e = JSON.parse(localStorage.getItem(ia) || "{}");
		if (!e || typeof e != "object") return t;
		V.some(([t]) => t === e.theme) && (t.theme = e.theme);
		for (let n of [
			"scanlines",
			"glow",
			"mascots",
			"boot",
			"sound",
			"typingSounds",
			"reduced"
		]) (e[n] === "on" || e[n] === "off") && (t[n] = e[n]);
		[
			"16",
			"17",
			"18"
		].includes(e.edSize) && (t.edSize = e.edSize), Ji.some(([t]) => t === e.uiLanguage) ? t.uiLanguage = e.uiLanguage : Ji.some(([t]) => t === e.feedbackLanguage) && (t.uiLanguage = e.feedbackLanguage), t.feedbackLanguage = t.uiLanguage, B.some(([t]) => t === e.panelLook) ? t.panelLook = e.panelLook : e.panelBlur === "off" && (t.panelLook = "solid"), Zi.some((t) => t.id === e.background) && (t.background = e.background);
		let n = Qi.filter((t) => e.skins?.[t.helper] === t.id);
		n.length && (t.skins = Object.fromEntries(n.map((e) => [e.helper, e.id])));
	} catch {}
	return t;
}
var sa = typeof window < "u" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null, ca = () => !!sa?.matches, la = (e) => !ca() && e.reduced !== "on";
function ua(e) {
	let t = oa();
	return !(t.boot !== "on" || !la(t) || t.sound !== "on");
}
// src/lib/sound.ts
var da, fa = /* @__PURE__ */ new Set(), pa = () => (da && da.state !== "closed" || (da = new AudioContext()), da), ma = .15;
function ha(e) {
	let t = {};
	return (n, r) => !Number.isFinite(r) || r - (t[n] ?? -Infinity) < e[n] ? !1 : (t[n] = r, !0);
}
function ga({ enabled: e, onBlocked: t = () => {}, createContext: n = pa, random: r = Math.random }) {
	if (!e) return null;
	let i, a, o;
	try {
		i = n(), a = i.createGain(), a.gain.setValueAtTime(ma, i.currentTime), a.connect(i.destination), o = i.createBuffer(1, Math.ceil(i.sampleRate * .6), i.sampleRate);
		let e = o.getChannelData(0);
		for (let t = 0; t < e.length; t++) e[t] = r() * 2 - 1;
	} catch {
		return n !== pa && i?.close().catch(() => {}), null;
	}
	let s = !1, c = /* @__PURE__ */ new Map(), l = () => !s && i.state === "running" && c.size < 12, u = () => {
		s || t(i.state !== "running" && i.state !== "closed");
	}, d = () => {
		if (s || i.state === "closed") return Promise.resolve();
		let e;
		try {
			e = i.resume().then(u, u);
		} catch {
			return u(), Promise.resolve();
		}
		return u(), e;
	}, f = () => d();
	typeof document < "u" && (document.addEventListener("pointerdown", f, !0), document.addEventListener("keydown", f, !0)), i.addEventListener("statechange", u), d();
	let p = (e) => {
		let t = c.get(e);
		t && (clearTimeout(t.timer), e.onended = null, e.disconnect(), t.chain.forEach((e) => e.disconnect()), c.delete(e));
	}, m = (e, t) => {
		let n, r = [], i = (e) => (r.push(e), e);
		try {
			return n = e(), t(n, i, r);
		} catch {
			if (n) {
				try {
					n.stop();
				} catch {}
				c.has(n) ? p(n) : (n.disconnect(), r.forEach((e) => e.disconnect()));
			}
			return null;
		}
	}, h = (e, t, n, r = 0) => {
		let o = n(i.createGain()), s = i.currentTime + r;
		return o.gain.setValueAtTime(0, s), o.gain.linearRampToValueAtTime(t, s + Math.min(.015, e / 4)), o.gain.exponentialRampToValueAtTime(1e-4, s + e), o.connect(a), o;
	}, g = (e, t, n, r, a = 0) => {
		c.set(e, {
			chain: t,
			gain: n
		}), e.onended = () => p(e), e.start(i.currentTime + a), r !== void 0 && e.stop(i.currentTime + a + r);
	}, _ = (e, t, n, r, a = "sine", o, s = 0) => {
		l() && m(() => i.createOscillator(), (c, l, u) => {
			let d = h(n, r, l, s);
			if (c.type = a, c.frequency.setValueAtTime(e, i.currentTime + s), c.frequency.exponentialRampToValueAtTime(t, i.currentTime + s + n), o !== void 0 && typeof i.createStereoPanner == "function") {
				let e = l(i.createStereoPanner());
				e.pan.setValueAtTime(Math.max(-1, Math.min(1, o)), i.currentTime), c.connect(e), e.connect(d);
			} else c.connect(d);
			g(c, u, d, n, s);
		});
	}, v = (e, t, n, r) => {
		l() && m(() => i.createBufferSource(), (a, s, c) => {
			let l = s(i.createBiquadFilter()), u = h(e, t, s);
			a.buffer = o, l.type = "lowpass", l.Q.value = .6, l.frequency.setValueAtTime(n, i.currentTime), l.frequency.exponentialRampToValueAtTime(r, i.currentTime + e), a.connect(l), l.connect(u), g(a, c, u, e);
		});
	}, y = (e, t) => l() ? m(() => i.createOscillator(), (n, r, o) => {
		let l = r(i.createGain());
		return n.type = "sine", n.frequency.setValueAtTime(e, i.currentTime), l.gain.setValueAtTime(0, i.currentTime), n.connect(l), l.connect(a), g(n, o, l), (e) => {
			!s && c.has(n) && (l.gain.cancelScheduledValues(i.currentTime), l.gain.setValueAtTime(l.gain.value, i.currentTime), l.gain.linearRampToValueAtTime(e ? t : 0, i.currentTime + .07));
		};
	}) : null, b = () => {
		c.forEach((e, t) => {
			if (!e.timer) {
				try {
					e.gain.gain.cancelScheduledValues(i.currentTime), e.gain.gain.setValueAtTime(e.gain.gain.value, i.currentTime), e.gain.gain.linearRampToValueAtTime(0, i.currentTime + .035), t.stop(i.currentTime + .035);
				} catch {}
				e.timer = setTimeout(() => {
					try {
						t.stop();
					} catch {}
					p(t);
				}, 50);
			}
		});
	};
	return fa.add(b), {
		ready: l,
		state: () => i.state,
		resume: d,
		tone: _,
		hiss: v,
		hum: y,
		clear: b,
		stop: () => {
			if (s) return;
			s = !0, fa.delete(b), i.removeEventListener("statechange", u), typeof document < "u" && (document.removeEventListener("pointerdown", f, !0), document.removeEventListener("keydown", f, !0)), t(!1);
			let e = () => {
				c.forEach((e, t) => {
					try {
						t.stop();
					} catch {}
					p(t);
				}), a.disconnect(), n !== pa && i.close().catch(() => {});
			};
			if (i.state !== "running") e();
			else {
				try {
					a.gain.cancelScheduledValues(i.currentTime), a.gain.setValueAtTime(a.gain.value, i.currentTime), a.gain.linearRampToValueAtTime(0, i.currentTime + .035);
				} catch {
					e();
					return;
				}
				setTimeout(e, 50);
			}
		}
	};
}
// src/lib/boot-sound.ts
var _a = {
	key: 35,
	stream: 55,
	ok: 160,
	glitch: 75,
	handoff: 600
}, va = () => ha(_a);
function ya({ now: e = () => performance.now(), random: t = Math.random, ...n }) {
	let r = {
		play() {},
		resume() {},
		state: () => "unavailable",
		stop() {}
	}, i = ga({
		...n,
		random: t
	});
	if (!i) return r;
	let a = va(), { tone: o, hiss: s } = i;
	return {
		resume: i.resume,
		state: i.state,
		stop: i.stop,
		play(n) {
			i.ready() && a(n, e()) && (n === "key" && o(750 + t() * 1100, 180 + t() * 180, .018, .09, "triangle"), n === "stream" && (s(.065, .045, 1600 + t() * 1200, 550), o(1e3 + t() * 1e3, 650, .025, .025, "triangle")), n === "ok" && o(820, 1120, .055, .13), n === "glitch" && (s(.085, .14, 2800, 180), o(75 + t() * 70, 45, .07, .06, "sawtooth")), n === "handoff" && (s(.5, .18, 160, 1200), o(48, 115, .5, .15)));
		}
	};
}
// shared/score.js?raw
var ba = "// Overall band and range. IELTS Writing: mean of the four whole criterion bands,\n// rounded DOWN to the half band (7,6,7,6 = 6.5; 7,7,6,5 = 6.25 -> 6.0).\n\nexport const CRITERIA = [\"tr\", \"cc\", \"lr\", \"gra\"];\nexport const ESTIMATE_LABEL = \"AI practice estimate (provisional calibration)\";\nexport const RAW_LABEL = \"AI practice estimate (uncalibrated)\";\n// Calibration v2 (research-data/marker/calibration_gemini_report_v2.json), fitted on all 27 official IELTS.org\n// scripts: Gemini 3.6 Flash squeezes bands toward the middle (raw bias -0.83, -1.67 on 7.5+ essays). A per-criterion\n// stretch round(1.313*band - 0.95), leave-one-out: within +/-0.5 52% -> 70%, within +/-1 70% -> 93%, MAE 0.91 -> 0.57,\n// bias +0.02 (the old +1 rule: 63% / 89%, MAE 0.69). The range stays +/-1 band: 27 scripts is a small set.\nexport const CALIBRATION = { id: \"cal-v2\", slope: 1.313, intercept: -0.95, scripts: 27 };\n// Calibrated open models land within ±0.5 band of the examiner on 53–65% of official scripts (leave-one-out), so ±0.5 is \"likely\"; ±1 covers 78–90%.\nconst RANGE = 0.5;\n\n// Flash-Lite (the overflow model) squeezes scores toward the middle: on all 27 official IELTS.org scripts it\n// gave 6–6.5 to essays examiners scored 8–8.5. A stretch fitted on those scripts\n// (research-data/marker/gemini_lite_report_runs.jsonl, leave-one-out): within ±0.5 48% -> 67%, within ±1 74% -> 89%,\n// bias -0.87 -> 0.00, bias on 7.5+ essays -2.0 -> -0.83. Applied per criterion, rounded to a whole band.\nexport const LITE_CALIBRATION = { id: \"lite-cal-v1\", slope: 1.606, intercept: -2.365, scripts: 27 };\n\n// Add independently fitted stretches under \"provider/model\" after official-script validation.\n// Never apply a Gemini fit (or another open model's fit) to a free-pool model.\n// Fitted 2026-10-30 (research-data/marker/calibration_*_v1.json, leave-one-out on official IELTS.org scripts):\n// Groq gpt-oss-120b (low reasoning, 17 scripts): within ±1 65% -> 88%, MAE 0.97 -> 0.71, bias -0.85 -> +0.09.\n// Workers AI mistral-small-3.1 (23 scripts): within ±1 65% -> 78%, MAE 1.02 -> 0.74, bias -0.67 -> 0.00.\n// Workers AI qwen3-30b-a3b-fp8 (25 scripts, 2026-11-01): within ±1 56% -> 84%, MAE 1.12 -> 0.82, bias -0.76 -> -0.14.\n//   About a third of mistral-small's neurons per report, so it goes first in the Workers chain.\n// Same model WITH band-boundary guide v2 (shared/guide.js), 25 scripts, 2026-11-01: within ±0.5 36% -> 76%, ±1 56% -> 88%,\n//   MAE 1.14 -> 0.48, weak (<=5.5) bias +0.20, strong (>=7) bias -0.40. The guide partly draws on these scripts' examiner comments.\n// Groq qwen3.8-27b (25 scripts, 2026-11-02, LOO, mean): within ±1 60% -> 92%, MAE 1.18 -> 0.52.\n// Groq gpt-oss-20b (low reasoning, 25 scripts, 2026-11-02): within ±1 60% -> 76%, MAE 1.14 -> 0.82. Fit on 14 kept: a refit on 25\n// (1.684, -2.811) scored identically, and mean calibration traded ±1 72% for MAE 0.76, so neither is clearly better.\n// Figures include the band-8 ceiling in calibrateOpen. All squeeze strong essays toward 5-6; refit when more scripts are marked.\nexport const OPEN_CALIBRATIONS = {\n  // With guide v2 (2026-11-01, 25 scripts, LOO): ±0.5 60%, ±1 84%, MAE 0.62. Same 17 scripts as v1: ±0.5 53->65%, MAE 0.71->0.59,\n  //   weak bias +0.69->+0.38, strong -0.67->-0.42, ±1 unchanged 88%.\n  \"groq/openai/gpt-oss-120b\": { id: \"groq-120b-guide2-cal-v1\", slope: 1.924, intercept: -3.691, scripts: 25, guide: \"v2\" },\n  // mean (LOO, 20 scripts): ±0.5 65 -> 70%, MAE 0.60 -> 0.50.\n  \"groq/qwen/qwen3.8-27b\": { id: \"groq-qwen27b-mean-cal-v1\", slope: 1.618, intercept: -2.226, scripts: 20, mean: true },\n  \"groq/openai/gpt-oss-20b\": { id: \"groq-20b-cal-v1\", slope: 1.491, intercept: -1.605, scripts: 14 },\n  \"cf/@cf/mistralai/mistral-small-3.1-24b-instruct\": { id: \"cf-mistral-small-cal-v1\", slope: 2.422, intercept: -7.36, scripts: 23 },\n  \"cf/@cf/qwen/qwen3-30b-a3b-fp8\": { id: \"cf-qwen3-30b-guide2-cal-v1\", slope: 2.856, intercept: -9.106, scripts: 25, guide: \"v2\" },\n  // Gemma 4 26B on Google AI Studio free tier (2026-11-01, 25 scripts, LOO): with guide v2 ±0.5 76%, ±1 96%, MAE 0.50\n  //   (no guide: 72%, 92%, 0.56). Median 23 s per Task, so it sits after Groq as the high-volume overflow.\n  //   mean: the overall stretches the criterion mean and rounds once (nearest half band). Per-criterion rounding at this\n  //   slope can never give a 5 (raw 4 -> 4.2, raw 5 -> 5.7). LOO: ±0.5 76 -> 84%, MAE 0.50 -> 0.44, weak-essay bias +0.40 -> +0.20.\n  //   prompt: \"lean\" (40% fewer input tokens, so ~7 checks a minute instead of ~5). Same 24 scripts, mean calibration: full ±0.5 83%, ±1 91%, MAE 0.46;\n  //   lean ±0.5 87%, ±1 95%, MAE 0.44 (weak bias +0.30 vs +0.15). Averaging several passes gave no gain.\n  // OVH keyless, no guide (2026-11-01, 24 scripts, LOO): ±0.5 67%, ±1 92%, MAE 0.60. Guide v2 was worse (79%, MAE 0.69).\n  \"ovh/Meta-Llama-3_3-70B-Instruct\": { id: \"ovh-llama70b-cal-v1\", slope: 1.555, intercept: -2.596, scripts: 24 },\n  // OVH keyless busy-time fallback, guide v2 (2026-11-01, 25 scripts, LOO): ±0.5 64%, ±1 88%, MAE 0.66 (before: 40%, 68%, 0.96).\n  \"ovh/Mistral-Small-3.2-24B-Instruct-2506\": { id: \"ovh-mistral32-guide2-cal-v1\", slope: 1.684, intercept: -3.165, scripts: 25, guide: \"v2\" },\n  \"google/gemma-4-26b-a4b-it\": { id: \"google-gemma26b-lean-guide2-mean-cal-v1\", slope: 1.394, intercept: -1.312, scripts: 24, guide: \"v2\", mean: true, prompt: \"lean\" },\n};\nconst OPEN_IDENTITY = { id: \"uncalibrated\", slope: 1, intercept: 0, scripts: 0 };\nexport function openCalibration(provider, model) {\n  return OPEN_CALIBRATIONS[`${provider}/${model}`] || OPEN_IDENTITY;\n}\n/** Calibrated overall for \"mean\" calibrations: stretch the raw criterion mean, round once to the nearest half band. */\nexport function calibrateOpenMean(bands, provider, model) {\n  const { slope, intercept, scripts } = openCalibration(provider, model);\n  const vals = CRITERIA.map((c) => bands[c]);\n  if (!vals.every(isBand)) return null;\n  return Math.round(2 * Math.max(1, Math.min(scripts ? 8 : 9, slope * vals.reduce((a, b) => a + b, 0) / 4 + intercept))) / 2;\n}\n/** A mean calibration can put the overall above the mean of very uneven bands (TR 4 with 8, 8, 8 gave 7.5). No official script has a spread this wide, so ordinary marks never change. */\nexport function capUneven(overall, bands) {\n  const vals = CRITERIA.map((c) => bands[c]);\n  if (overall === null || !vals.every(isBand) || Math.max(...vals) - Math.min(...vals) < 3) return overall;\n  return Math.min(overall, overallBand(bands));\n}\nexport function calibrateOpen(band, provider, model) {\n  if (!isBand(band)) return band;\n  const { slope, intercept, scripts } = openCalibration(provider, model);\n  // No fit set contains an official script above 8.5, so a stretch must not extrapolate to 9\n  // (gpt-oss-120b's stretch would turn every raw 7 into a 9).\n  return Math.max(1, Math.min(scripts ? 8 : 9, Math.round(slope * band + intercept)));\n}\n\n/** Stretch calibration for Flash-Lite bands; null stays null. */\nexport function calibrateLite(band) {\n  if (!isBand(band)) return band;\n  return Math.max(1, Math.min(9, Math.round(LITE_CALIBRATION.slope * band + LITE_CALIBRATION.intercept)));\n}\n\n/** Applies the calibration to a whole band (criterion or sub-skill); null stays null. */\nexport function calibrate(band) {\n  return isBand(band) ? Math.max(1, Math.min(9, Math.round(CALIBRATION.slope * band + CALIBRATION.intercept))) : band;\n}\n\nexport function isBand(n) {\n  return Number.isInteger(n) && n >= 1 && n <= 9;\n}\n\n/** @param {Record<string, number|null>} bands */\nexport function overallBand(bands) {\n  const vals = CRITERIA.map((c) => bands[c]);\n  if (!vals.every(isBand)) return null; // a withheld criterion means no overall, never 0\n  const mean = vals.reduce((a, b) => a + b, 0) / 4;\n  return Math.floor(mean * 2 + 1e-9) / 2;\n}\n\n// Models over-reward short answers (a 75-word Task 1 report got 7.5). Official scripts at 72-88% of the minimum scored 4-5.5, one at 93% scored 7.\n// shortcut: no official script is below 72%, so the lower cap is a cautious judgement; refine it if shorter scored scripts turn up.\nexport const lengthCap = (words, task) => { const share = words / (task === \"t2\" ? 250 : 150); return share < 0.75 ? 5.5 : share < 0.9 ? 6.5 : null; };\n\n// Uncalibrated markers keep the wide ±1 band range.\nexport function bandRange(overall, calibrated = true) {\n  if (overall == null) return null;\n  const width = calibrated ? RANGE : 1;\n  return { lo: Math.max(1, overall - width), hi: Math.min(9, overall + width) };\n}\n", xa = "// Reviewer step (code checks). Nothing reaches the student unless it passes these checks:\n// - corrections/upgrades: \"original\" must be an exact substring of the essay, the fix must\n//   differ from the original, and any criterion label must be valid;\n// - criterion bands must be whole numbers 1-9; invalid ones are reported for one repair\n//   retry and otherwise withheld (null), never shown as 0.\nimport { CRITERIA, isBand } from \"./score.js\";\n\nconst CRIT_ALIASES = Object.assign(Object.create(null), { tr: \"tr\", ta: \"tr\", cc: \"cc\", lr: \"lr\", gra: \"gra\" });\nconst MAX_ITEMS = 25;\n\nconst str = (v, max = 1500) => (typeof v === \"string\" ? v.trim().slice(0, max) : \"\");\nconst strList = (v, n) => (Array.isArray(v) ? v.map((s) => str(s, 400)).filter(Boolean).slice(0, n) : []);\n\n/** Returns the canonical criterion, null when absent, or false when present but invalid. */\nexport function normCriterion(v) {\n  if (v === undefined || v === null || v === \"\") return null;\n  if (typeof v !== \"string\") return false;\n  const k = v.trim().toLowerCase();\n  return Object.hasOwn(CRIT_ALIASES, k) ? CRIT_ALIASES[k] : false;\n}\n\n/** Strict whole-band check: accepts 7 or \"7\", rejects 6.5, \"6.5\", 0, 10, \"seven\". */\nexport function parseBand(v) {\n  const n = typeof v === \"string\" && /^\\s*\\d+\\s*$/.test(v) ? Number(v) : v;\n  return isBand(n) ? n : null;\n}\n\nexport function invalidCriteria(raw) {\n  const c = raw && typeof raw === \"object\" ? raw.criteria : null;\n  return CRITERIA.filter((k) => parseBand(c?.[k]?.band) === null);\n}\n\nfunction reviewFixes(list, essay, fixKey, defaultCrit) {\n  const kept = [];\n  const seen = new Set();\n  let dropped = 0;\n  for (const item of Array.isArray(list) ? list : []) {\n    const original = typeof item?.original === \"string\" ? item.original : \"\";\n    const fix = str(item?.[fixKey], 500);\n    const crit = normCriterion(item?.criterion);\n    const ok =\n      original.trim().length > 0 &&\n      essay.includes(original) &&\n      fix.length > 0 &&\n      fix !== original.trim() &&\n      crit !== false &&\n      !seen.has(original);\n    if (!ok || kept.length >= MAX_ITEMS) { dropped++; continue; }\n    seen.add(original);\n    kept.push({ original, [fixKey]: fix, reason: str(item?.reason, 600), criterion: crit || defaultCrit });\n  }\n  return { kept, dropped };\n}\n\nfunction reviewCriteria(raw) {\n  const out = {};\n  for (const k of CRITERIA) {\n    const c = raw?.criteria?.[k] ?? {};\n    const subs = c.subskills && typeof c.subskills === \"object\" ? c.subskills : {};\n    out[k] = {\n      band: parseBand(c.band),\n      summary: str(c.summary, 1200),\n      subskills: Object.entries(subs)\n        .map(([key, v]) => ({ key, score: parseBand(v) }))\n        .filter((s) => s.score !== null && /^[a-z_]{2,40}$/.test(s.key))\n        .slice(0, 8),\n    };\n  }\n  return out;\n}\n\nfunction splitParagraphs(essay) {\n  return essay.split(/\\n\\s*\\n|\\n/).map((p) => p.trim()).filter(Boolean);\n}\n\nfunction reviewParagraphs(list, essay) {\n  const real = splitParagraphs(essay);\n  return (Array.isArray(list) ? list : []).slice(0, 8).map((p, i) => {\n    const start = typeof p?.original_start === \"string\" ? p.original_start.trim() : \"\";\n    // Only quote text that really is in the essay; otherwise fall back to the real paragraph start.\n    const quote = start && essay.includes(start) ? start : (real[i] || \"\").split(/\\s+/).slice(0, 10).join(\" \");\n    const comments = {};\n    for (const k of CRITERIA) comments[k] = str(p?.comments?.[k], 800);\n    return { label: str(p?.label, 40) || `Paragraph ${i + 1}`, quote, comments, rewrite: str(p?.how_to_rewrite, 2500) };\n  }).filter((p) => CRITERIA.some((k) => p.comments[k]) || p.rewrite);\n}\n\n/** Turn the model's raw JSON into the reviewed report the student sees. */\nexport function reviewReport(raw, essay) {\n  const grammar = reviewFixes(raw?.grammar_corrections, essay, \"corrected\", \"gra\");\n  const upgrades = reviewFixes(raw?.word_choice_upgrades, essay, \"better\", \"lr\");\n  return {\n    criteria: reviewCriteria(raw),\n    grammar: grammar.kept,\n    upgrades: upgrades.kept,\n    paragraphs: reviewParagraphs(raw?.paragraphs, essay),\n    structureAdvice: str(raw?.structure_advice, 1500),\n    strengths: strList(raw?.strengths, 6),\n    priorities: strList(raw?.top_3_priorities, 3),\n    dropped: { grammar: grammar.dropped, upgrades: upgrades.dropped },\n  };\n}\n", Sa = "// Input validation for POST /api/mark. Returns { ok: true, value } or { ok: false, error }.\n\nimport { feedbackLanguage } from \"./language.js\";\n\nexport const TASKS = {\n  t2: { name: \"Task 2 essay\", minWords: 250 },\n  gt1: { name: \"General Training Task 1 letter\", minWords: 150 },\n  ac1: { name: \"Academic Task 1 report\", minWords: 150 },\n};\nexport const MAX_IMAGE_BYTES = 4 * 1024 * 1024;\nexport const MAX_BODY_BYTES = 7 * 1024 * 1024; // 4 MB image as base64 (~5.6 MB) plus text\nconst MIMES = new Set([\"image/png\", \"image/jpeg\"]);\nconst MIN_WORDS = 50; // below this there is too little to mark; save the shared quota\nconst MAX_WORDS = 1200;\nconst MAX_QUESTION_CHARS = 3000;\n\nexport function countWords(text) {\n  const m = String(text).trim().match(/[A-Za-z0-9À-ɏ'’-]+/g);\n  return m ? m.length : 0;\n}\n\nexport function validateMarkRequest(body) {\n  if (!body || typeof body !== \"object\") return fail(\"Send a JSON object.\");\n  const { task, question, essay, chartImageBase64, mime } = body;\n  if (!Object.hasOwn(TASKS, task)) return fail(\"Unknown task type.\");\n  if (typeof question !== \"string\" || question.trim().length < 10) return fail(\"Add the question you answered.\");\n  if (question.length > MAX_QUESTION_CHARS) return fail(\"The question is too long.\");\n  if (typeof essay !== \"string\") return fail(\"Add your essay.\");\n  const words = countWords(essay);\n  if (words < MIN_WORDS) return fail(`Write at least ${MIN_WORDS} words before asking for an estimate.`);\n  if (words > MAX_WORDS || essay.length > 12000) return fail(`Essays over ${MAX_WORDS} words are not accepted.`);\n\n  let image = null;\n  const chartDescription = typeof body.chartDescription === \"string\" ? body.chartDescription.trim() : \"\";\n  if (chartDescription.length > 6000) return fail(\"Keep the chart description to 6,000 characters or fewer.\");\n  if (task === \"ac1\") {\n    if (!chartImageBase64 && !chartDescription) return fail(\"Academic Task 1 needs a chart image or a typed chart description.\");\n    if (chartImageBase64) {\n    if (typeof chartImageBase64 !== \"string\") return fail(\"The chart image could not be read.\");\n    if (!MIMES.has(mime)) return fail(\"The chart must be a PNG or JPG image.\");\n    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(chartImageBase64)) return fail(\"The chart image could not be read.\");\n    const bytes = Math.floor((chartImageBase64.length * 3) / 4);\n    if (bytes > MAX_IMAGE_BYTES) return fail(\"The chart image must be 4 MB or smaller.\");\n    image = { data: chartImageBase64, mime };\n    }\n  }\n  return { ok: true, value: { task, question: question.trim(), essay: essay.trim(), words, image, ...(task === \"ac1\" ? { chartDescription } : {}), ...(body.reportMode === \"full\" ? { reportMode: \"full\" } : {}), feedbackLanguage: feedbackLanguage(body.feedbackLanguage) } };\n}\n\nfunction fail(error) {\n  return { ok: false, error };\n}\n\n/** A student's picture of a question: same type and size limits as a chart image. */\nexport function validateQuestionImage(body) {\n  const fail = (error) => ({ ok: false, error });\n  if (!body || typeof body !== \"object\") return fail(\"Send a picture of the question.\");\n  const { imageBase64, mime } = body;\n  if (typeof imageBase64 !== \"string\" || !imageBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return fail(\"That picture could not be read.\");\n  if (!MIMES.has(mime)) return fail(\"The picture must be a PNG or JPG image.\");\n  if (Math.floor((imageBase64.length * 3) / 4) > MAX_IMAGE_BYTES) return fail(\"The picture must be 4 MB or smaller.\");\n  return { ok: true, value: { data: imageBase64, mime } };\n}\n", Ca = "const SEEN_KEY = \"bandexe-boot-seen-v1\";\n/** Seconds from mount. One continuous typing phase, logo, then handoff. */\nexport const BOOT_TIMELINE = {\n  full: { codeAt: 0.25, floodAt: 1.4, kernelAt: 2.25, logoAt: 3.8, handoffAt: 6.9, end: 7.5 },\n  returning: { logoAt: 0, handoffAt: 1.4, end: 2 },\n} as const;\n/** Independent escape hatches, comfortably beyond the animated timelines. */\nexport const SAFETY_MS = { full: 10000, returning: 4000 };\n\n/** dmesg-style stamp of real elapsed seconds since the intro began. */\nexport const stamp = (seconds: number) => `[${Math.max(0, seconds).toFixed(6).padStart(11)}]`;\n\nconst BROWSERS: [RegExp, string][] = [\n  [/Edg\\/(\\d+)/, \"EDGE\"], [/OPR\\/(\\d+)/, \"OPERA\"], [/Firefox\\/(\\d+)/, \"FIREFOX\"],\n  [/Chrome\\/(\\d+)/, \"CHROME\"], [/Version\\/(\\d+)[\\d.]* .*Safari/, \"SAFARI\"],\n];\nconst SYSTEMS: [RegExp, string][] = [\n  [/iPhone|iPad/, \"IOS\"], [/Android/, \"ANDROID\"], [/CrOS/, \"CHROMEOS\"],\n  [/Mac OS X|Macintosh/, \"MACOS\"], [/Windows/, \"WINDOWS\"], [/Linux/, \"LINUX\"],\n];\n/** Best-effort names read from the user agent; \"UNKNOWN\" rather than a guess. */\nexport function describeAgent(ua: string) {\n  const hit = BROWSERS.map(([re, name]) => [re.exec(ua), name] as const).find(([match]) => match);\n  return {\n    browser: hit ? `${hit[1]} ${hit[0]![1]}` : \"UNKNOWN\",\n    os: SYSTEMS.find(([re]) => re.test(ua))?.[1] ?? \"UNKNOWN\",\n  };\n}\n\nexport const GATE_TIMEOUT_MS = 2000;\n/** Search crawlers never press a key: they get the same page without the decorative intro. */\nexport const isCrawler = (ua: string) => /Googlebot|Google-InspectionTool|Storebot-Google|bingbot|BingPreview|DuckDuckBot|Applebot|YandexBot|Baiduspider|Slurp|facebookexternalhit|Twitterbot|LinkedInBot|Chrome-Lighthouse/i.test(ua);\nexport type BootPhase = \"gate\" | \"playing\" | \"done\";\nexport const initialBootPhase = (audioState: string): BootPhase => audioState === \"suspended\" || audioState === \"interrupted\" ? \"gate\" : \"playing\";\nexport const bootTransition = (phase: BootPhase, event: \"gesture\" | \"skip\" | \"timeout\"): BootPhase =>\n  phase === \"gate\" && event !== \"skip\" ? \"playing\" : \"done\";\n\n/** Gate and animation each have an independent escape deadline, even without animation frames. */\nexport function beginBoot(onDone: () => void, replay = false, options: { audioState?: string; onStart?: (gesture: boolean) => void; onUnlock?: () => void; waitForKey?: boolean } = {}) {\n  // Owner rule: a fresh load always stops at PRESS ANY KEY and never starts by itself. A replay was already a click.\n  const holdGate = Boolean(options.waitForKey) && !replay;\n  let phase: BootPhase = holdGate ? \"gate\" : initialBootPhase(options.audioState ?? \"running\");\n  const returning = false;\n  void replay;\n  let safety: ReturnType<typeof setTimeout>;\n  let deadline = 0;\n  let heldKey: string | undefined;\n  let unlocked = ![\"suspended\", \"interrupted\"].includes(options.audioState ?? \"running\");\n  const unlock = () => { if (!unlocked) { unlocked = true; options.onUnlock?.(); } };\n  const arm = (limit: number) => { clearTimeout(safety); deadline = Date.now() + limit; safety = setTimeout(expire, limit); };\n  const dispose = () => {\n    phase = \"done\";\n    clearTimeout(safety);\n    document.removeEventListener(\"keydown\", onKey, true);\n    document.removeEventListener(\"keyup\", onRelease, true);\n    window.removeEventListener(\"blur\", onBlur);\n    document.removeEventListener(\"pointerdown\", onPointer, true);\n    document.removeEventListener(\"visibilitychange\", onVisible);\n    window.removeEventListener(\"pageshow\", onVisible);\n  };\n  const finish = () => {\n    if (phase === \"done\") return;\n    dispose();\n    try { localStorage.setItem(SEEN_KEY, \"1\"); } catch { /* private browsing */ }\n    onDone();\n  };\n  const expire = () => {\n    if (phase === \"gate\" && holdGate) return; // waits for a key, click or tap (Skip intro still works)\n    if (phase === \"gate\") { phase = \"playing\"; arm(SAFETY_MS.full); options.onStart?.(false); }\n    else finish();\n  };\n  const gesture = () => {\n    unlock();\n    phase = bootTransition(phase, \"gesture\");\n    if (phase === \"playing\") { arm(SAFETY_MS.full); options.onStart?.(true); }\n  };\n  const isSkip = (event: Event) => (event.target as Element | null)?.closest?.(\".boot__skip\");\n  const onKey = (event: KeyboardEvent) => {\n    const firstUnlock = !unlocked;\n    unlock();\n    event.preventDefault();\n    event.stopImmediatePropagation();\n    if (heldKey !== undefined && heldKey === event.code) return;\n    heldKey = event.code;\n    if (phase === \"playing\" && firstUnlock) return;\n    if (phase === \"gate\" && !(isSkip(event) && (event.key === \"Enter\" || event.key === \" \"))) gesture();\n    else { holdUntilKeyUp(event.code); finish(); }\n  };\n  const onRelease = (event: KeyboardEvent) => {\n    if (event.code !== heldKey) return;\n    event.preventDefault();\n    heldKey = undefined;\n  };\n  const onBlur = () => { heldKey = undefined; };\n  const onPointer = (event: PointerEvent) => {\n    if (event.button !== 0 || event.isPrimary === false || isSkip(event)) return;\n    unlock();\n    if (phase !== \"gate\") return;\n    event.preventDefault();\n    event.stopImmediatePropagation();\n    gesture();\n  };\n  const onVisible = () => { if (Date.now() >= deadline && !(phase === \"gate\" && holdGate)) expire(); };\n  document.addEventListener(\"keydown\", onKey, true);\n  document.addEventListener(\"keyup\", onRelease, true);\n  window.addEventListener(\"blur\", onBlur);\n  document.addEventListener(\"pointerdown\", onPointer, true);\n  document.addEventListener(\"visibilitychange\", onVisible);\n  window.addEventListener(\"pageshow\", onVisible);\n  if (phase === \"gate\" && holdGate) { deadline = Infinity; } else arm(phase === \"gate\" ? GATE_TIMEOUT_MS : SAFETY_MS.full);\n  if (phase === \"playing\") options.onStart?.(false);\n  return { returning, finish, dispose };\n}\n\n/** Swallows auto-repeats of the skip key, which would otherwise type into the freshly focused editor. */\nfunction holdUntilKeyUp(code: string) {\n  const block = (event: KeyboardEvent) => {\n    if (event.code !== code) return;\n    event.preventDefault();\n    event.stopImmediatePropagation();\n  };\n  const release = (event?: Event) => {\n    if (event?.type === \"keyup\" && (event as KeyboardEvent).code !== code) return;\n    document.removeEventListener(\"keydown\", block, true);\n    document.removeEventListener(\"keyup\", release, true);\n    window.removeEventListener(\"blur\", release);\n  };\n  document.addEventListener(\"keydown\", block, true);\n  document.addEventListener(\"keyup\", release, true);\n  window.addEventListener(\"blur\", release);\n}\n\n// Moving between site pages (Writing <-> Speaking) should not replay the intro; a reload or a new visit still plays it.\nconst SKIP_KEY = \"bandexe-skip-boot\";\nexport function skipNextBoot() { try { sessionStorage.setItem(SKIP_KEY, \"1\"); } catch { /* blocked storage: the intro plays */ } }\nexport function consumeSkipBoot() {\n  try { const skip = sessionStorage.getItem(SKIP_KEY) === \"1\"; sessionStorage.removeItem(SKIP_KEY); return skip; } catch { return false; }\n}\n", wa = "// Pure helpers for the \"Checking your answer\" scan: which phrases get a box, and when the report may open.\nimport type { Crit, Fix } from \"./types\";\n\nexport type IssueKind = \"grammar\" | \"upgrade\";\nexport interface Issue {\n  id: number;\n  para: number; // paragraph index (after paragraphs() splitting)\n  start: number; // UTF-16 offsets inside that paragraph\n  end: number;\n  crit: Crit;\n  kind: IssueKind;\n  index: number; // position of the fix in its list (grammar or upgrades)\n}\n\n/**\n * Map reviewed fixes to exact spans of the essay, in reading order.\n * First occurrence of each quote wins; a quote that is not found inside one paragraph, or that\n * overlaps an earlier span, gets no box (it is still listed in the report).\n */\nexport function matchIssues(paras: string[], grammar: Fix[], upgrades: Fix[]): Issue[] {\n  const found: Omit<Issue, \"id\">[] = [];\n  const add = (f: Fix, kind: IssueKind, index: number) => {\n    if (!f.original || !f.original.trim()) return;\n    for (let p = 0; p < paras.length; p++) {\n      const at = paras[p].indexOf(f.original);\n      if (at < 0) continue;\n      const end = at + f.original.length;\n      if (!found.some((h) => h.para === p && at < h.end && end > h.start)) found.push({ para: p, start: at, end, crit: f.criterion, kind, index });\n      return;\n    }\n  };\n  grammar.forEach((f, i) => add(f, \"grammar\", i));\n  upgrades.forEach((f, i) => add(f, \"upgrade\", i));\n  found.sort((a, b) => a.para - b.para || a.start - b.start);\n  return found.map((h, id) => ({ ...h, id }));\n}\n\n/** Split one paragraph into plain text and issue segments (for rendering spans). */\nexport function segments(text: string, para: number, issues: Issue[]): { text: string; issue?: Issue }[] {\n  const out: { text: string; issue?: Issue }[] = [];\n  let pos = 0;\n  for (const h of issues.filter((i) => i.para === para)) {\n    if (h.start > pos) out.push({ text: text.slice(pos, h.start) });\n    out.push({ text: text.slice(h.start, h.end), issue: h });\n    pos = h.end;\n  }\n  if (pos < text.length) out.push({ text: text.slice(pos) });\n  return out;\n}\n\n/**\n * The report opens only when the result is back AND the scan has finished\n * (spider reached the bottom and boxed every issue, or the fallback sequence ended, or the user skipped).\n */\nexport function canOpenReport(s: { status: \"pending\" | \"done\" | \"error\"; scanDone: boolean; skipped: boolean }): boolean {\n  return s.status === \"done\" && (s.scanDone || s.skipped);\n}\n\n/**\n * Once the result is back the crawl gets a bounded budget (seconds): it hurries, and at the end of the budget the\n * spider wraps up (boxes the rest, dashes to the bottom). HARD_STOP seconds later the scan ends regardless.\n */\nexport const crawlBudget = (issues: number) => Math.min(16, 6 + 0.45 * Math.max(0, issues));\nexport const HARD_STOP = 3;\n\n/** Milliseconds from `now` until the wrap-up and until the forced finish, given when the result arrived (0 = now). */\nexport function scanDeadlines(doneAt: number, now: number, issues: number) {\n  const wrap = doneAt + crawlBudget(issues) * 1000 - now;\n  return { wrapIn: Math.max(0, wrap), stopIn: Math.max(0, wrap + HARD_STOP * 1000) };\n}\n\n/** Add box ids once each, keeping the order they were boxed in. */\nexport const addBoxes = (have: number[], ids: number[]) => {\n  const out = have.slice();\n  for (const id of ids) if (!out.includes(id)) out.push(id);\n  return out.length === have.length ? have : out;\n};\n\nexport const CODE: Record<Crit, string> = { tr: \"TR\", cc: \"CC\", lr: \"LR\", gra: \"GRA\" };\nexport const issueTag = (i: Pick<Issue, \"crit\" | \"kind\">) => `${CODE[i.crit]} · ${i.kind === \"grammar\" ? \"grammar\" : \"word choice\"}`;\n\n/** Merge per-fragment client rects into one rect per visual line (same top within 4px). */\nexport function mergeLines<R extends { left: number; right: number; top: number; bottom: number }>(rects: R[]) {\n  const lines: { left: number; right: number; top: number; bottom: number }[] = [];\n  for (const r of rects) {\n    if (r.right - r.left < 1) continue;\n    const l = lines.find((q) => Math.abs(q.top - r.top) < 4);\n    if (l) { l.left = Math.min(l.left, r.left); l.right = Math.max(l.right, r.right); l.bottom = Math.max(l.bottom, r.bottom); }\n    else lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });\n  }\n  return lines.sort((a, b) => a.top - b.top);\n}\n\n/** Reading progress uses the furthest paragraph actually reached, never the marker's elapsed time. */\nexport function scanProgress(reached: number, total: number, complete = false) {\n  const count = Math.max(0, Math.floor(total));\n  const paragraph = count ? Math.min(count, Math.max(1, Math.floor(reached) + 1)) : 0;\n  return {\n    text: complete ? \"Scan complete\" : paragraph ? `Scanning paragraph ${paragraph} of ${count}` : \"Waiting for essay text\",\n    value: complete ? count : Math.max(0, paragraph - 1),\n    max: count || 1,\n  };\n}\n\nexport const SCAN_EVENTS = { start: \"bandexe:scan-start\", end: \"bandexe:scan-end\", report: \"bandexe:report-open\" } as const;\n/** Per evaluation, independent of renders, motion, sound and scan re-entry. No essay or result payload. */\nexport function createScanEvents(dispatch: (event: CustomEvent) => void = (event) => { window.dispatchEvent(event); }) {\n  const sent = new Set<keyof typeof SCAN_EVENTS>();\n  const emit = (name: keyof typeof SCAN_EVENTS) => {\n    if (sent.has(name)) return;\n    sent.add(name);\n    dispatch(new CustomEvent(SCAN_EVENTS[name]));\n  };\n  return {\n    start: () => emit(\"start\"),\n    end: () => { emit(\"start\"); emit(\"end\"); },\n    report: () => { emit(\"start\"); emit(\"end\"); emit(\"report\"); },\n  };\n}\n", Ta = "// Guest history: results only (bands, overall, word count, priorities), never the essay text.\n// Stored in this browser's localStorage; every access is wrapped because storage can be blocked.\nimport { reportThemes } from \"./progress\";\nimport type { Crit, MarkResult, Task } from \"./types\";\nimport { feedbackText } from \"./feedback\";\nimport { foreignScript } from \"../../shared/language.js\";\nimport { getUILanguage } from \"./i18n\";\n\nexport interface HistoryEntry {\n  id: string;\n  date: string; // ISO\n  task: Task;\n  overall: number | null;\n  range: { lo: number; hi: number } | null;\n  bands: Record<Crit, number | null>;\n  words: number;\n  markingVersion: string;\n  checker?: MarkResult[\"checker\"];\n  feedbackOnly?: boolean; // stored without any band; never plotted or celebrated\n  priorities: string[];\n  language?: string; // feedback language, so saved text in another alphabet can be hidden\n  themes?: string[];\n}\n\nexport const HISTORY_KEY = \"bandexe-history-v1\";\nconst KEY = HISTORY_KEY;\ntype Store = Pick<Storage, \"getItem\" | \"setItem\" | \"removeItem\">;\nconst defaultStore = (): Store | null => {\n  try { return window.localStorage; } catch { return null; }\n};\n\nexport function loadHistory(store: Store | null = defaultStore()): HistoryEntry[] {\n  try {\n    const v = JSON.parse(store?.getItem(KEY) || \"[]\");\n    if (!Array.isArray(v)) return [];\n    const band = (n: unknown) => n === null || typeof n === \"number\" && Number.isFinite(n) && n >= 0 && n <= 9;\n    return v.filter((entry): entry is HistoryEntry => entry && typeof entry.id === \"string\"\n      && [\"t2\", \"gt1\", \"ac1\"].includes(entry.task) && Number.isFinite(Date.parse(entry.date))\n      && band(entry.overall) && [\"tr\", \"cc\", \"lr\", \"gra\"].every((c) => band(entry.bands?.[c]))\n      && typeof entry.words === \"number\" && Number.isFinite(entry.words) && entry.words >= 0\n      && Array.isArray(entry.priorities) && entry.priorities.every((p: unknown) => typeof p === \"string\")\n      && (!entry.themes || Array.isArray(entry.themes) && entry.themes.every((t: unknown) => typeof t === \"string\"))\n      && (entry.range === null || entry.range && band(entry.range.lo) && band(entry.range.hi)\n        && typeof entry.range.lo === \"number\" && typeof entry.range.hi === \"number\" && entry.range.lo <= entry.range.hi))\n      // Reports saved before the alphabet guard can hold priorities in the wrong alphabet (Thai in Vietnamese was seen).\n      .map((entry) => ({ ...entry, priorities: entry.priorities.filter((p) => !foreignScript(p, entry.language ?? getUILanguage())) }))\n      .map((entry) => entry.feedbackOnly ? { ...entry, overall: null, range: null,\n        bands: { tr: null, cc: null, lr: null, gra: null }, priorities: entry.priorities.map(feedbackText).filter(Boolean) } : entry).slice(-200);\n  } catch {\n    return [];\n  }\n}\n\nexport function toEntry(r: MarkResult, now = new Date()): HistoryEntry {\n  const feedbackOnly = r.feedbackOnly === true;\n  return {\n    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,\n    date: now.toISOString(),\n    task: r.task,\n    overall: feedbackOnly ? null : r.overall,\n    range: feedbackOnly ? null : r.range,\n    bands: Object.fromEntries(Object.entries(r.report.criteria).map(([k, c]) => [k, feedbackOnly ? null : c.band])) as Record<Crit, number | null>,\n    words: r.words,\n    markingVersion: r.markingVersion,\n    checker: r.checker || \"site\",\n    ...(feedbackOnly ? { feedbackOnly } : {}),\n    ...(r.feedbackLanguage ? { language: r.feedbackLanguage } : {}),\n    themes: reportThemes(r.report),\n    priorities: (feedbackOnly ? r.report.priorities.map(feedbackText).filter(Boolean) : r.report.priorities).slice(0, 3),\n  };\n}\n\n/** Best previous valid overall for the same task type, or null when there is none. */\nexport function previousBest(history: HistoryEntry[], task: Task): number | null {\n  const vals = history.filter((h) => h.task === task && !h.feedbackOnly && typeof h.overall === \"number\").map((h) => h.overall as number);\n  return vals.length ? Math.max(...vals) : null;\n}\n\n/** A personal best needs a valid new overall that beats an earlier result of the same task type. */\nexport function personalBest(history: HistoryEntry[], entry: HistoryEntry): { prev: number; next: number } | null {\n  if (entry.overall === null || entry.feedbackOnly) return null;\n  const prev = previousBest(history.filter((h) => h.id !== entry.id), entry.task);\n  return prev !== null && entry.overall > prev ? { prev, next: entry.overall } : null;\n}\n\nexport function addEntry(entry: HistoryEntry, store: Store | null = defaultStore()): HistoryEntry[] {\n  const next = [...loadHistory(store), entry].slice(-200);\n  try { store?.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or blocked: keep in memory */ }\n  return next;\n}\n\nexport function clearHistory(store: Store | null = defaultStore()): void {\n  try { store?.removeItem(KEY); } catch { /* ignore */ }\n}\n", Ea = /* @__PURE__ */ e(((e) => {
	var t = Symbol.for("react.transitional.element");
	function n(e, n, r) {
		var i = null;
		if (r !== void 0 && (i = "" + r), n.key !== void 0 && (i = "" + n.key), "key" in n) for (var a in r = {}, n) a !== "key" && (r[a] = n[a]);
		else r = n;
		return n = r.ref, {
			$$typeof: t,
			type: e,
			key: i,
			ref: n === void 0 ? null : n,
			props: r
		};
	}
	e.jsx = n, e.jsxs = n;
})), H = (/* @__PURE__ */ e(((e, t) => {
	t.exports = Ea();
})))(), Da = "BAND.EXE", Oa = /"version":\s*"([^"]+)"/.exec("{\n  \"name\": \"bandexe-app\",\n  \"private\": true,\n  \"version\": \"0.1.0\",\n  \"type\": \"module\",\n  \"engines\": {\n    \"node\": \">=22\"\n  },\n  \"scripts\": {\n    \"dev\": \"npm run prompts && node scripts/dev.js\",\n    \"dev:fixture\": \"npm run prompts && MARK_FIXTURE=1 node scripts/dev.js\",\n    \"server\": \"node server/index.js\",\n    \"build\": \"npm run prompts && tsc --noEmit && vite build\",\n    \"test\": \"npm run prompts && vitest run\",\n    \"prompts\": \"node scripts/generate-prompts.js\",\n    \"cf:dev\": \"npm run build && wrangler pages dev dist\",\n    \"cf:deploy\": \"npm run build && wrangler pages deploy dist --project-name bandexe\"\n  },\n  \"dependencies\": {\n    \"@mlc-ai/web-llm\": \"0.2.85\",\n    \"gsap\": \"3.15.0\",\n    \"lenis\": \"1.3.27\",\n    \"react\": \"19.3.1\",\n    \"react-dom\": \"19.3.1\"\n  },\n  \"devDependencies\": {\n    \"@types/react\": \"19.3.0\",\n    \"@types/react-dom\": \"19.3.0\",\n    \"@vitejs/plugin-react\": \"6.1.2\",\n    \"typescript\": \"7.0.2\",\n    \"vite\": \"8.3.5\",\n    \"vitest\": \"5.0.5\",\n    \"wrangler\": \"4.149.0\"\n  }\n}\n")?.[1] ?? "dev", ka = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/[]<>_+=*", Aa = [
	["shared/score.js", ba],
	["shared/review.js", xa],
	["shared/validate.js", Sa],
	["src/lib/scan.ts", wa],
	["src/lib/history.ts", Ta],
	["src/lib/boot.ts", Ca]
], ja = Aa.flatMap(([e, t]) => [`// ---- ${e}`, ...t.split("\n").filter((e) => e.trim())]), Ma = /^(export|function|const|interface|type|\/\/ ----)/, Na = Math.floor(ja.length / 2), Pa = [
	["Cue the writing workspace", [
		"Set a place for your next draft",
		"Clear the desk of old notes",
		"Frame the question"
	]],
	["Lay out the tasks", [
		"Task 2 · build an argument",
		"Academic Task 1 · describe the chart",
		"General Task 1 · write a letter"
	]],
	["Pin the four criteria to the wall", [
		"Task response · address the question",
		"Coherence · give ideas a clear path",
		"Cohesion · connect each paragraph",
		"Lexical resource · choose with care",
		"Grammar · vary the sentence"
	]],
	["Prepare the band descriptor notes", ["Read the public descriptors, not rumours", "Band 6 and band 7 · know the difference"]],
	["Sketch the essay shape", [
		"Leave room for an introduction",
		"State a clear position",
		"One main idea per body paragraph",
		"Reserve a line for the conclusion"
	]],
	["Plan the Task 1 report", [
		"Keep the overview in sight",
		"Group the key features",
		"Compare, don't just list"
	]],
	["Plan the letter", ["Match the tone to the reader", "Cover every bullet point"]],
	["Mark the word-count rail", ["Task 1 · at least 150 words", "Task 2 · at least 250 words"]],
	["Arrange the review controls", ["Leave the estimate to a real check", "Show the reason beside each note"]],
	["Seat the helpers", [
		"Coach · a nudge, then your words",
		"Synonyms · meaning before variety",
		"Ideas · a starting point"
	]],
	["Sharpen the vocabulary shelf", [
		"Shelve the linking words",
		"Retire 'in conclusion' for a day",
		"Collocations before rare words"
	]],
	["Tune the grammar bench", [
		"Mix simple and complex sentences",
		"Check the articles",
		"Watch subject-verb agreement"
	]],
	["Clear the stage for your writing", []]
], Fa = Aa.flatMap(([e, t]) => Array.from(t.matchAll(/export (?:async )?(?:function|const|class|interface|type) (\w+)/g), (t) => `source: ${t[1]} <- ${e}`)), Ia = Pa.flatMap(([e, t], n) => [
	["ok", e],
	...t.map((e) => ["sub", `band: ${e}`]),
	...Fa.slice(n * 4, n * 4 + 4).map((e) => ["sym", e])
]);
function La({ onDone: e, content: t, replay: n = !1 }) {
	let r = (0, c.useRef)(null), i = (0, c.useRef)(null), a = (0, c.useRef)(() => {}), o = (0, c.useRef)(e);
	return o.current = e, (0, c.useLayoutEffect)(() => {
		let e = performance.now(), s = r.current, c = t.current, l = (e) => s.querySelector(e), u = (e) => Array.from(s.querySelectorAll(e)), d, f, p = !1, m, h = () => {}, g = () => {}, _ = innerWidth <= 600, v = _ ? 64 : 96, y = Pi.full, b = () => {
			if (!p) {
				e = performance.now(), s.classList.remove("is-gated"), i.current?.focus({ preventScroll: !0 });
				try {
					let t = (e) => f?.play(e);
					d = Mi.context(() => {
						let n = Mi.timeline({ onComplete: () => h() });
						n.set(s, { attr: { "data-version": "full" } });
						let r = (e) => {
							for (; e.childElementCount > v;) e.firstElementChild.remove();
						}, i = (e, t, n) => {
							e.style.transform = `translateY(-${Math.max(0, (t + 1) * n - innerHeight + 30)}px)`;
						}, a = (e, r, i, a) => {
							let o = { n: 0 }, s = 0;
							n.to(o, {
								n: r.length,
								duration: a,
								ease: "none",
								onUpdate: () => {
									let n = Math.floor(o.n);
									n !== s && (s = n, e.textContent = r.slice(0, n), t("key"));
								}
							}, i);
						};
						{
							let { codeAt: o, floodAt: s, kernelAt: c, logoAt: d } = Pi.full, f = u(".boot__code-col").filter((e) => getComputedStyle(e).display !== "none"), p = f.map((e) => e.querySelector(".boot__code-feed")), m = parseFloat(getComputedStyle(f[0]).lineHeight), h = (e, t) => {
								let n = document.createElement("div");
								return n.textContent = t, Ma.test(t) && (n.className = "is-hot"), e.append(n), n;
							}, g = (s - o) / 3;
							ja.slice(0, 3).forEach((e, t) => {
								let r = document.createElement("div");
								n.call(() => {
									p[0].append(r);
								}, [], o + t * g), Ma.test(e) && (r.className = "is-hot"), a(r, e, o + t * g, g * .94);
							}), f.length > 1 && n.set(f.slice(1), { autoAlpha: 1 }, s);
							let v = { n: 3 }, y = 3;
							n.to(v, {
								n: Math.min(_ ? 200 : 650, ja.length),
								duration: c - s,
								ease: "power2.in",
								onUpdate: () => {
									let e = Math.floor(v.n);
									e !== y && (p.forEach((t, n) => {
										for (let r = y; r < e; r++) h(t, ja[(r + n * Na) % ja.length]);
										r(t), i(f[n], t.childElementCount, m);
									}), y = e, t("stream"));
								}
							}, s);
							let b = zi(navigator.userAgent), x = "UNKNOWN";
							try {
								x = Intl.DateTimeFormat().resolvedOptions().timeZone || x;
							} catch {}
							let S = [
								["env", `BAND.EXE ${Oa} · decorative sequence`],
								["env", `browser: ${b.browser} · OS: ${b.os}`],
								["env", `locale: ${navigator.language} · time zone: ${x}`],
								["env", `viewport: ${innerWidth}×${innerHeight} · pixel ratio: ${devicePixelRatio}`],
								["env", `browser reports: ${navigator.onLine ? "ONLINE" : "OFFLINE"}`],
								["env", `theme: ${document.documentElement.dataset.theme || "mono"}`],
								["env", `bundled source: ${Aa.length} files · ${ja.length} nonempty lines`]
							], C = [...S, ...Ia.filter(([e]) => !_ || e !== "sym")], w = l(".boot__kernel-feed"), T = l(".boot__kernel-scroll"), E = parseFloat(getComputedStyle(w).lineHeight), D = { n: S.length }, O = 0;
							n.set(".boot__code", { autoAlpha: 0 }, c).set(".boot__kernel", { autoAlpha: 1 }, c).to(D, {
								n: C.length,
								duration: d - c,
								ease: "power1.in",
								onUpdate: () => {
									let n = Math.floor(D.n);
									if (n !== O) {
										for (; O < n; O++) {
											let [n, r] = C[O], i = document.createElement("div");
											i.className = `k k--${n}`;
											for (let t of [
												Ii((performance.now() - e) / 1e3),
												n === "ok" ? "[ OK ]" : "",
												r
											]) {
												let e = document.createElement("span");
												e.textContent = t, i.append(e);
											}
											w.append(i), n === "ok" && t("ok");
										}
										r(w), i(T, w.childElementCount, E), t("stream");
									}
								}
							}, c).set(".boot__kernel", { autoAlpha: 0 }, d);
						}
						let o = l(".boot__title-word"), d = l(".boot__title-text"), f = (e) => {
							d.textContent = e, o.dataset.text = e;
						}, p = (e) => Da.split("").map((t, n) => n < e ? t : ka[Math.floor(Math.random() * 45)]).join(""), m = (e) => {
							if (s.classList.toggle("is-glitching", e), !e) return;
							let n = Math.random() * 70;
							o.style.setProperty("--g-top", `${n}%`), o.style.setProperty("--g-bot", `${Math.max(0, 100 - n - 8 - Math.random() * 25)}%`), o.style.setProperty("--g-x", `${(Math.random() < .5 ? -1 : 1) * (3 + Math.random() * 7)}px`), t("glitch");
						}, g = { n: 0 }, b = -1;
						n.set(".boot__title", { autoAlpha: 1 }, y.logoAt).to(g, {
							n: 11,
							duration: .85,
							ease: "none",
							onUpdate: () => {
								let e = Math.floor(g.n * 4);
								if (e === b) return;
								b = e;
								let t = Math.max(0, Math.floor(g.n) - 2);
								f(p(t)), m(t < 8 && e % 2 == 0);
							},
							onComplete: () => {
								f(Da), m(!1);
							}
						}, y.logoAt).fromTo(".boot__title-sweep", {
							scaleY: 0,
							yPercent: -100
						}, {
							scaleY: 1,
							yPercent: 650,
							duration: .7,
							ease: "power1.inOut"
						}, y.logoAt + .1).fromTo(".boot__title-line", { scaleX: 0 }, {
							scaleX: 1,
							duration: .45,
							ease: "power2.out"
						}, y.logoAt + .7), a(l(".boot__title-sub"), "IELTS WRITING TERMINAL", y.logoAt + .9, .55), n.to(".boot__title-ver", {
							opacity: 1,
							duration: .2
						}, y.logoAt + 1.5), [
							1.15,
							1.5,
							1.65,
							2.3,
							2.47,
							2.65
						].forEach((e, t) => {
							n.call(() => {
								f(p(6)), m(!0);
							}, [], y.logoAt + e).set(o, { opacity: t % 2 ? .5 : .75 }, y.logoAt + e).call(() => {
								f(Da), m(!1);
							}, [], y.logoAt + e + .055).set(o, { opacity: 1 }, y.logoAt + e + .055);
						});
						let x = y.end - y.handoffAt;
						n.call(() => t("handoff"), [], y.handoffAt).to(".boot__title", {
							autoAlpha: 0,
							scale: 1.02,
							duration: x,
							ease: "power1.in"
						}, y.handoffAt).to(".boot__backdrop, .boot__controls", {
							autoAlpha: 0,
							duration: x
						}, y.handoffAt).to(c, {
							opacity: 1,
							duration: x,
							ease: "power1.out"
						}, y.handoffAt);
					}, s);
				} catch {
					h();
				}
			}
		};
		try {
			f = ya({ enabled: ua(!1) }), n && Vi(f.state()) !== "gate" || (s.classList.add("is-gated"), s.focus({ preventScroll: !0 }));
			let e = Ui(() => {
				p = !0, clearTimeout(m), f?.stop(), d?.revert(), o.current();
			}, n, {
				audioState: f.state(),
				waitForKey: !0,
				onUnlock: () => {
					Promise.resolve(f?.resume()).catch(() => {});
				},
				onStart: (e) => {
					if (!e) {
						queueMicrotask(b);
						return;
					}
					let t = !1, n = () => {
						t || p || (t = !0, clearTimeout(m), b());
					};
					m = setTimeout(n, 600), Promise.resolve(f?.resume()).then(n, n);
				}
			});
			h = e.finish, g = e.dispose, a.current = h;
		} catch {
			o.current();
		}
		return () => {
			p = !0, clearTimeout(m), g(), f?.stop(), d?.revert(), s.classList.remove("is-glitching"), u(".boot__code-feed, .boot__kernel-feed").forEach((e) => e.replaceChildren());
		};
	}, [t, n]), /* @__PURE__ */ (0, H.jsxs)("div", {
		className: "boot",
		ref: r,
		tabIndex: -1,
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "BAND.EXE decorative intro",
		"aria-describedby": "bootNote",
		children: [
			/* @__PURE__ */ (0, H.jsx)("div", { className: "boot__backdrop" }),
			/* @__PURE__ */ (0, H.jsxs)("div", {
				className: "boot__gate",
				children: [
					/* @__PURE__ */ (0, H.jsxs)("span", { children: ["BAND.EXE v", Oa] }),
					/* @__PURE__ */ (0, H.jsxs)("p", { children: [/* @__PURE__ */ (0, H.jsx)("span", {
						className: "cursor-block",
						"aria-hidden": "true"
					}), " [ PRESS ANY KEY TO BOOT ]"] }),
					/* @__PURE__ */ (0, H.jsx)("span", {
						className: "boot__touch",
						children: "or tap / click anywhere"
					})
				]
			}),
			/* @__PURE__ */ (0, H.jsx)("div", {
				className: "boot__code",
				"aria-hidden": "true",
				children: [0, 1].map((e) => /* @__PURE__ */ (0, H.jsxs)("div", {
					className: "boot__code-col",
					children: [/* @__PURE__ */ (0, H.jsx)("div", { className: "boot__code-feed" }), /* @__PURE__ */ (0, H.jsx)("span", { className: "cursor-block boot__cursor" })]
				}, e))
			}),
			/* @__PURE__ */ (0, H.jsx)("div", {
				className: "boot__kernel",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, H.jsxs)("div", {
					className: "boot__kernel-scroll",
					children: [/* @__PURE__ */ (0, H.jsx)("div", { className: "boot__kernel-feed" }), /* @__PURE__ */ (0, H.jsx)("span", { className: "cursor-block boot__cursor" })]
				})
			}),
			/* @__PURE__ */ (0, H.jsxs)("div", {
				className: "boot__title",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, H.jsxs)("div", {
						className: "boot__title-word",
						"data-text": Da,
						children: [/* @__PURE__ */ (0, H.jsx)("span", {
							className: "boot__title-text",
							children: Da
						}), /* @__PURE__ */ (0, H.jsx)("span", { className: "boot__title-sweep" })]
					}),
					/* @__PURE__ */ (0, H.jsx)("span", { className: "boot__title-line" }),
					/* @__PURE__ */ (0, H.jsx)("span", { className: "boot__title-sub" }),
					/* @__PURE__ */ (0, H.jsxs)("span", {
						className: "boot__title-ver",
						children: [
							"BUILD ",
							Oa,
							" · FREE PRACTICE"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, H.jsxs)("div", {
				className: "boot__controls",
				children: [
					/* @__PURE__ */ (0, H.jsx)("span", {
						className: "boot__note",
						id: "bootNote",
						children: "Decorative intro."
					}),
					/* @__PURE__ */ (0, H.jsx)("div", {
						className: "boot__actions",
						children: /* @__PURE__ */ (0, H.jsxs)("button", {
							ref: i,
							type: "button",
							className: "btn btn--quiet boot__skip",
							onClick: () => a.current(),
							children: ["Skip intro ", /* @__PURE__ */ (0, H.jsx)("span", {
								"aria-hidden": "true",
								children: "↵ / Esc"
							})]
						})
					}),
					/* @__PURE__ */ (0, H.jsx)("span", {
						className: "boot__key-hint",
						"aria-hidden": "true",
						children: "PRESS ANY KEY"
					})
				]
			})
		]
	});
}
// tools/speaking-boot/entry.tsx
matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.add("motion-ok");
var Ra = Qi.find((e) => e.helper === "coach" && e.id === oa().skins?.coach);
Ra && window.wearSkin?.(Ra.svg);
var za = document.createElement("div");
for (za.id = "speaking-app"; document.body.firstChild;) za.appendChild(document.body.firstChild);
document.body.appendChild(za);
var Ba = document.createElement("div");
document.body.appendChild(Ba);
function Va() {
	let e = (0, c.useRef)(za), [t, n] = (0, c.useState)(() => !qi() && !matchMedia("(prefers-reduced-motion: reduce)").matches);
	return (0, c.useLayoutEffect)(() => {
		t || (za.style.opacity = "1");
	}, [t]), t ? /* @__PURE__ */ (0, H.jsx)(La, {
		content: e,
		onDone: () => n(!1)
	}) : null;
}
document.querySelectorAll("a[href=\"/\"]").forEach((e) => e.addEventListener("click", Ki)), (0, l.createRoot)(Ba).render(/* @__PURE__ */ (0, H.jsx)(Va, {}));
