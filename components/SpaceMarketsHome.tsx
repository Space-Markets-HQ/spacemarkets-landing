'use client';

import React from 'react';
import GlobeV2 from './GlobeV2';

interface Props {
	/** Optional URL of the promo film; empty string keeps the poster idle state. */
	videoUrl?: string;
	/** Subtle probability jitter on the market cards (off when reduced motion is set). */
	liveFlicker?: boolean;
}

interface State {
	scrolled: boolean;
	contactOpen: boolean;
	contactSubmitted: boolean;
	menuOpen: boolean;
	/** ≤900px — switches the hero globe to its mobile framing (remounts it). */
	isMobile: boolean;
	videoPlaying: boolean;
	faqOpen: number | null;
	smiActive: string | null;
	sel: {[id: string]: 'yes' | 'no' | null};
	jitter: number[];
}

export default class SpaceMarketsHome extends React.Component<Props, State> {
	static defaultProps = {videoUrl: '', liveFlicker: true};

	state: State = {
		scrolled: false,
		contactOpen: false,
		contactSubmitted: false,
		menuOpen: false,
		isMobile: false,
		videoPlaying: false,
		faqOpen: 0,
		smiActive: null,
		sel: {},
		jitter: [0, 0, 0, 0]
	};

	// Body scroll is unlocked synchronously (not via setState) so an anchor
	// tap's default scroll, which fires before React re-renders, still works.
	_closeMenu = () => {
		document.body.style.overflow = '';
		this.setState({menuOpen: false});
	};

	_onScroll?: () => void;
	_onKey?: (e: KeyboardEvent) => void;
	_mql?: MediaQueryList;
	_onMql?: () => void;
	_iv?: ReturnType<typeof setInterval>;
	_root = React.createRef<HTMLDivElement>();
	_io?: IntersectionObserver;

	componentDidMount() {
		this._onScroll = () => {
			const s = window.scrollY > 12;
			if (s !== this.state.scrolled) this.setState({scrolled: s});
		};
		window.addEventListener('scroll', this._onScroll, {passive: true});
		this._onScroll();
		this._onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && this.state.menuOpen) this._closeMenu();
		};
		window.addEventListener('keydown', this._onKey);
		this._mql = window.matchMedia('(max-width: 900px)');
		this._onMql = () => this.setState({isMobile: this._mql!.matches});
		this._mql.addEventListener('change', this._onMql);
		if (this._mql.matches) this.setState({isMobile: true});
		if (this.props.liveFlicker !== false && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			this._iv = setInterval(() => {
				this.setState((st) => ({
					jitter: st.jitter.map((j) => Math.max(-2, Math.min(2, j + (Math.random() < 0.5 ? -1 : 1))))
				}));
			}, 3200);
		}
		// Scroll-reveal: hide data-reveal blocks (via the sm-animated root class,
		// added only when JS runs) and reveal each as it enters the viewport.
		const root = this._root.current;
		if (root && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			root.classList.add('sm-animated');
			this._io = new IntersectionObserver(
				(entries) => {
					for (const en of entries) {
						if (en.isIntersecting) {
							en.target.classList.add('sm-revealed');
							this._io?.unobserve(en.target);
						}
					}
				},
				{rootMargin: '0px 0px -12% 0px'}
			);
			// Elements already at/above the reveal threshold (deep links, scroll
			// restoration) show instantly — this runs pre-paint, so hiding and
			// re-animating content the user is already looking at never flashes.
			const limit = window.innerHeight * 0.88;
			root.querySelectorAll('[data-reveal]').forEach((el) => {
				if (el.getBoundingClientRect().top < limit) el.classList.add('sm-revealed', 'sm-instant');
				else this._io?.observe(el);
			});
		}
	}
	componentWillUnmount() {
		if (this._onScroll) window.removeEventListener('scroll', this._onScroll);
		if (this._onKey) window.removeEventListener('keydown', this._onKey);
		if (this._mql && this._onMql) this._mql.removeEventListener('change', this._onMql);
		document.body.style.overflow = '';
		clearInterval(this._iv);
		this._io?.disconnect();
	}

	spark(seed: number, startY: number, endY: number, vol: number, w: number, h: number) {
		const pts = [];
		for (let i = 0; i < 24; i++) {
			const t = i / 23;
			const trend = startY + (endY - startY) * (t * t * (3 - 2 * t));
			const noise = Math.sin(i * 1.93 + seed * 7.1) * 0.55 + Math.sin(i * 0.61 + seed * 3.3) * 0.45;
			const y = Math.min(h - 3, Math.max(3, trend + noise * vol * Math.sin(t * Math.PI)));
			pts.push(`${(t * w).toFixed(1)} ${y.toFixed(1)}`);
		}
		return `M ${pts.join(' L ')}`;
	}

	renderVals() {
		const st = this.state;
		const P = '#23E6A8',
			R = '#FF4D5E';
		const BASE = [
			{
				id: 'm1',
				category: 'Launch',
				question: 'Will Starship deploy an operational payload into orbit by Dec. 31, 2026?',
				prob: 64,
				resolves: 'Dec. 31, 2026',
				volume: '$214K',
				seed: 2
			},
			{
				id: 'm2',
				category: 'Orbital compute',
				question: 'Will Starcloud-2 begin operating an orbital GPU compute service by June 30, 2027?',
				prob: 57,
				resolves: 'June 30, 2027',
				volume: '$147K',
				seed: 3
			},
			{
				id: 'm3',
				category: 'Lunar',
				question: 'Will Blue Ghost Mission 2 successfully land on the Moon by June 30, 2027?',
				prob: 71,
				resolves: 'June 30, 2027',
				volume: '$98K',
				seed: 4
			}
		];
		const markets = BASE.map((b, i) => {
			const prob = Math.max(3, Math.min(97, b.prob + st.jitter[i]));
			const sel = st.sel[b.id];
			const spark = this.spark(b.seed, prob > 50 ? 28 : 10, prob > 50 ? 8 : 26, 6, 120, 36);
			return {
				...b,
				prob,
				yes: prob,
				no: 100 - prob,
				spark,
				sparkArea: spark + ' L 120 36 L 0 36 Z',
				sparkStroke: prob > 50 ? P : R,
				sparkFill: prob > 50 ? 'rgba(35,230,168,0.12)' : 'rgba(255,77,94,0.12)',
				yesBorder: sel === 'yes' ? 'rgba(35,230,168,0.65)' : 'rgba(255,255,255,0.12)',
				yesBg: sel === 'yes' ? 'rgba(35,230,168,0.16)' : 'rgba(255,255,255,0.04)',
				noBorder: sel === 'no' ? 'rgba(255,77,94,0.65)' : 'rgba(255,255,255,0.12)',
				noBg: sel === 'no' ? 'rgba(255,77,94,0.16)' : 'rgba(255,255,255,0.04)',
				stateLabel: sel ? (sel === 'yes' ? 'Position — Yes' : 'Position — No') : 'USDC / Base',
				stateColor: sel ? (sel === 'yes' ? P : R) : '#8E99AA',
				pickYes: () => this.setState((s) => ({sel: {...s.sel, [b.id]: s.sel[b.id] === 'yes' ? null : 'yes'}})),
				pickNo: () => this.setState((s) => ({sel: {...s.sel, [b.id]: s.sel[b.id] === 'no' ? null : 'no'}}))
			};
		});

		const SECT = [
			{key: 'LNCH', display: '212.4', delta: '+1.2%', positive: true, sp: [2, 118, 84, 16]},
			{key: 'CMPT', display: '318.9', delta: '+4.1%', positive: true, sp: [3, 142, 24, 12]},
			{key: 'COMM', display: '154.2', delta: '-0.6%', positive: false, sp: [4, 84, 102, 13]},
			{key: 'ENRG', display: '96.7', delta: '+2.3%', positive: true, sp: [5, 124, 58, 18]}
		];
		const active = SECT.find((s) => s.key === st.smiActive) || null;
		const comp = {display: '1,284.6', delta: '+2.4%', positive: true, sp: [1, 132, 36, 14]};
		const cur = active || comp;
		const smiPath = this.spark(cur.sp[0], cur.sp[1] / 3.5, cur.sp[2] / 3.5, cur.sp[3] / 2, 480, 168);
		const sectors = SECT.map((s) => ({
			ticker: s.key,
			display: s.display,
			delta: s.delta,
			tickerColor: st.smiActive === s.key ? '#20D9FF' : '#8E99AA',
			deltaColor: s.positive ? P : R,
			rowBg: st.smiActive === s.key ? 'rgba(255,255,255,0.04)' : 'transparent',
			enter: () => this.setState({smiActive: s.key})
		}));

		const FAQS = [
			{
				q: 'What is Space Markets?',
				a: 'Space Markets is building Event Markets for pricing and hedging mission-critical risk, alongside Asset Leasing Markets for verified orbital capacity.'
			},
			{
				q: 'Who can join the private beta?',
				a: "We're inviting operators, buyers, capital partners, and builders working across the orbital economy."
			},
			{q: 'How does settlement work?', a: 'Contracts settle in USDC on Base. Lease payments can stream as verified capacity is delivered.'},
			{
				q: 'Is the data live?',
				a: 'Not yet. Market prices, volumes, and index values are illustrative while the product is in private beta.'
			}
		];

		const videoSrc = this.props.videoUrl ?? '';
		return {
			navBg: st.scrolled ? 'rgba(3,7,11,0.8)' : 'transparent',
			navBorder: st.scrolled ? 'rgba(255,255,255,0.1)' : 'transparent',
			navBlur: st.scrolled ? 'blur(20px)' : 'none',
			openContact: () => this.setState({contactOpen: true, contactSubmitted: false}),
			closeContact: () => this.setState({contactOpen: false}),
			isMobile: st.isMobile,
			menuOpen: st.menuOpen,
			openMenu: () => {
				document.body.style.overflow = 'hidden';
				this.setState({menuOpen: true});
			},
			closeMenu: this._closeMenu,
			menuRequestAccess: () => {
				document.body.style.overflow = '';
				this.setState({menuOpen: false, contactOpen: true, contactSubmitted: false});
			},
			menuLinks: [
				{label: 'Markets', href: '#events'},
				{label: 'Leasing', href: '#markets'},
				{label: 'SMI', href: '#smi'},
				{label: 'Participants', href: '#infrastructure'}
			],
			stopProp: (e: React.MouseEvent) => e.stopPropagation(),
			submitContact: () => this.setState({contactSubmitted: true}),
			contactOpen: st.contactOpen,
			contactSubmitted: st.contactSubmitted,
			contactFormVisible: !st.contactSubmitted,
			videoSrc,
			videoPlaying: st.videoPlaying && !!videoSrc,
			videoIdle: !(st.videoPlaying && !!videoSrc),
			filmCaption: videoSrc ? 'Play the film' : 'Promotional film — final cut pending',
			playFilm: () => {
				if (videoSrc) this.setState({videoPlaying: true});
			},
			markets,
			capacity: [
				{index: '01', name: 'Launch & transport', meta: 'Slots · downmass'},
				{index: '02', name: 'Communications', meta: 'Bandwidth · ground access'},
				{index: '03', name: 'Compute & power', meta: 'Reserved capacity'}
			],
			agents: [
				{
					index: '01',
					title: 'Discover capacity',
					line: 'Search available infrastructure, compare terms and identify services required for a mission.'
				},
				{
					index: '02',
					title: 'Price and manage risk',
					line: 'Monitor event probabilities and propose hedges against delays, failures and capacity constraints.'
				},
				{
					index: '03',
					title: 'Assemble mission packages',
					line: 'Combine communications, power, compute, mobility and other services into executable workflows.'
				},
				{
					index: '04',
					title: 'Coordinate settlement',
					line: 'Monitor delivery conditions and initiate payments as contracted services are verified.'
				}
			],
			smiValue: cur.display,
			smiDelta: cur.delta,
			smiTicker: active ? active.key : 'SMI',
			smiDeltaColor: cur.positive ? P : R,
			smiDeltaBorder: cur.positive ? 'rgba(35,230,168,0.3)' : 'rgba(255,77,94,0.3)',
			smiDeltaBg: cur.positive ? 'rgba(35,230,168,0.1)' : 'rgba(255,77,94,0.1)',
			smiPath,
			smiAreaPath: smiPath + ' L 480 168 L 0 168 Z',
			smiClear: () => this.setState({smiActive: null}),
			sectors,
			roles: [
				{index: '01', role: 'Operators', line: 'Sell unused capacity.'},
				{index: '02', role: 'Buyers', line: 'Source and reserve capacity.'},
				{index: '03', role: 'Capital partners', line: 'Price and hedge event risk.'},
				{index: '04', role: 'Builders', line: 'Integrate the market layer.'}
			],
			faqs: FAQS.map((f, i) => ({
				...f,
				open: st.faqOpen === i,
				iconTransform: st.faqOpen === i ? 'rotate(45deg)' : 'rotate(0deg)',
				toggle: () => this.setState((s) => ({faqOpen: s.faqOpen === i ? null : i}))
			}))
		};
	}

	render() {
		const v = this.renderVals();
		return (
			<div ref={this._root} style={{background: '#03070B', minHeight: '100vh'}}>
				{/* NAV */}
				<nav
					className='sm-nav'
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						zIndex: 60,
						padding: '14px 40px',
						borderBottom: `1px solid ${v.navBorder}`,
						background: v.navBg,
						backdropFilter: v.navBlur,
						WebkitBackdropFilter: v.navBlur,
						transition: 'background 0.3s,border-color 0.3s'
					}}
				>
					<div
						style={{
							maxWidth: 1280,
							margin: '0 auto',
							width: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: 16
						}}
					>
						<a href='#top' aria-label='Space Markets — home' style={{display: 'inline-flex', alignItems: 'center'}}>
							<img
								className='sm-logo-full'
								src='/space-markets-logo.svg'
								alt='Space Markets'
								style={{height: 28, width: 'auto', display: 'block'}}
							/>
						</a>
						<div className='sm-nav-links' style={{display: 'flex', alignItems: 'center', gap: 32}}>
							<a href='#events' className='sm-hover-light' style={{fontSize: 13, color: '#8E99AA'}}>
								Markets
							</a>
							<a href='#markets' className='sm-hover-light' style={{fontSize: 13, color: '#8E99AA'}}>
								Leasing
							</a>
							<a href='#smi' className='sm-hover-light' style={{fontSize: 13, color: '#8E99AA'}}>
								SMI
							</a>
							<a href='#infrastructure' className='sm-hover-light' style={{fontSize: 13, color: '#8E99AA'}}>
								Participants
							</a>
							<a
								href='https://markets.spacemarkets.com'
								className='sm-hover-bright sm-nav-cta'
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									boxSizing: 'border-box',
									gap: 8,
									border: 'none',
									borderRadius: 999,
									background: '#0B6BFF',
									color: '#F5F8FF',
									fontFamily: "'Inter',sans-serif",
									fontSize: 13,
									fontWeight: 500,
									padding: '10px 20px',
									minHeight: 44,
									cursor: 'pointer',
									boxShadow: '0 0 28px rgba(11,107,255,0.35)',
									transition: 'filter 0.2s',
									textDecoration: 'none'
								}}
							>
								Explore markets{' '}
								<span aria-hidden='true' style={{fontSize: 14}}>
									↗
								</span>
							</a>
							<button
								type='button'
								onClick={v.openMenu}
								aria-label='Open menu'
								aria-expanded={v.menuOpen}
								aria-controls='sm-mobile-menu'
								className='sm-nav-burger'
								style={{
									display: 'none',
									flexDirection: 'column',
									alignItems: 'flex-end',
									justifyContent: 'center',
									gap: 5,
									width: 44,
									height: 44,
									margin: '0 -8px',
									border: 'none',
									background: 'none',
									padding: '0 2px',
									cursor: 'pointer'
								}}
							>
								<span aria-hidden='true' style={{display: 'block', width: 22, height: 1.5, background: '#F5F8FF'}}></span>
								<span aria-hidden='true' style={{display: 'block', width: 15, height: 1.5, background: '#F5F8FF'}}></span>
							</button>
						</div>
					</div>
				</nav>

				{/* MOBILE MENU */}
				{v.menuOpen && (
					<div
						id='sm-mobile-menu'
						role='dialog'
						aria-modal='true'
						aria-label='Menu'
						style={{
							position: 'fixed',
							inset: 0,
							zIndex: 70,
							display: 'flex',
							flexDirection: 'column',
							background: 'rgba(3,7,11,0.96)',
							backdropFilter: 'blur(20px)',
							WebkitBackdropFilter: 'blur(20px)'
						}}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								padding: '12px 20px',
								borderBottom: '1px solid rgba(255,255,255,0.1)'
							}}
						>
							<img src='/space-markets-logo.svg' alt='Space Markets' style={{height: 22, width: 'auto'}} />
							<button
								type='button'
								onClick={v.closeMenu}
								aria-label='Close menu'
								className='sm-hover-light'
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: 44,
									height: 44,
									margin: '0 -12px 0 0',
									border: 'none',
									background: 'none',
									color: '#8E99AA',
									fontSize: 26,
									cursor: 'pointer'
								}}
							>
								×
							</button>
						</div>
						<nav aria-label='Site sections' style={{display: 'flex', flexDirection: 'column', padding: '24px 20px 0'}}>
							{v.menuLinks.map((l) => (
								<a
									key={l.href}
									href={l.href}
									onClick={v.closeMenu}
									className='sm-hover-cyan'
									style={{
										padding: '16px 0',
										borderBottom: '1px solid rgba(255,255,255,0.08)',
										fontFamily: "'Space Grotesk',sans-serif",
										fontWeight: 300,
										fontSize: 32,
										letterSpacing: '-0.02em',
										color: '#F5F8FF',
										transition: 'color 0.2s'
									}}
								>
									{l.label}
								</a>
							))}
						</nav>
						<div style={{marginTop: 'auto', padding: '0 20px calc(24px + env(safe-area-inset-bottom))'}}>
							<button
								type='button'
								onClick={v.menuRequestAccess}
								className='sm-hover-bright'
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: 8,
									width: '100%',
									boxSizing: 'border-box',
									border: 'none',
									borderRadius: 999,
									background: '#0B6BFF',
									color: '#F5F8FF',
									fontFamily: "'Inter',sans-serif",
									fontSize: 14,
									fontWeight: 500,
									padding: '14px 26px',
									minHeight: 48,
									cursor: 'pointer',
									boxShadow: '0 0 28px rgba(11,107,255,0.35)',
									transition: 'filter 0.2s'
								}}
							>
								Contact Us <span aria-hidden='true'>↗</span>
							</button>
							<a
								href='https://x.com/SpaceMarketsHQ'
								target='_blank'
								rel='noopener noreferrer'
								className='sm-hover-light'
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: 8,
									minHeight: 44,
									marginTop: 10,
									fontSize: 13,
									color: '#8E99AA'
								}}
							>
								<svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' style={{width: 15, height: 15}}>
									<path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z'></path>
								</svg>
								Follow Space Markets on X
							</a>
						</div>
					</div>
				)}

				{/* PLATE 00 — HERO (per the "Hero Final" design: star field + twinkles,
            "Backed by" badge on top, side-by-side globe on desktop, stacked
            centered copy with the globe below on mobile) */}
				<section
					id='top'
					data-screen-label='Hero'
					style={{position: 'relative', minHeight: '100svh', overflow: 'hidden', background: '#03070B'}}
				>
					<div
						aria-hidden='true'
						className='sm-stars-d'
						style={{
							position: 'absolute',
							inset: 0,
							pointerEvents: 'none',
							backgroundImage:
								'radial-gradient(1px 1px at 6% 30%,rgba(207,224,255,0.5) 50%,transparent 51%),radial-gradient(1.5px 1.5px at 16% 12%,rgba(207,224,255,0.55) 50%,transparent 51%),radial-gradient(1px 1px at 27% 74%,rgba(207,224,255,0.35) 50%,transparent 51%),radial-gradient(1px 1px at 38% 20%,rgba(207,224,255,0.45) 50%,transparent 51%),radial-gradient(1.5px 1.5px at 48% 60%,rgba(207,224,255,0.4) 50%,transparent 51%),radial-gradient(1px 1px at 33% 46%,rgba(207,224,255,0.4) 50%,transparent 51%),radial-gradient(1px 1px at 10% 90%,rgba(207,224,255,0.4) 50%,transparent 51%),radial-gradient(1.5px 1.5px at 42% 90%,rgba(207,224,255,0.45) 50%,transparent 51%)'
						}}
					>
						<span
							style={{
								position: 'absolute',
								left: '22%',
								top: '16%',
								width: 3,
								height: 3,
								borderRadius: '50%',
								background: '#cfe0ff',
								boxShadow: '0 0 8px 2px rgba(32,217,255,0.5)',
								animation: 'sm-twinkle 3.8s ease-in-out infinite'
							}}
						></span>
						<span
							style={{
								position: 'absolute',
								left: '44%',
								top: '42%',
								width: 2,
								height: 2,
								borderRadius: '50%',
								background: '#cfe0ff',
								boxShadow: '0 0 7px 2px rgba(32,217,255,0.4)',
								animation: 'sm-twinkle 4.8s ease-in-out 1.5s infinite'
							}}
						></span>
						<span
							style={{
								position: 'absolute',
								left: '7%',
								top: '68%',
								width: 2,
								height: 2,
								borderRadius: '50%',
								background: '#cfe0ff',
								boxShadow: '0 0 7px 2px rgba(255,157,59,0.3)',
								animation: 'sm-twinkle 5.4s ease-in-out 0.8s infinite'
							}}
						></span>
					</div>
					<div
						aria-hidden='true'
						className='sm-stars-m'
						style={{
							display: 'none',
							position: 'absolute',
							inset: 0,
							pointerEvents: 'none',
							backgroundImage:
								'radial-gradient(1px 1px at 10% 14%,rgba(207,224,255,0.5) 50%,transparent 51%),radial-gradient(1.5px 1.5px at 26% 6%,rgba(207,224,255,0.55) 50%,transparent 51%),radial-gradient(1px 1px at 44% 18%,rgba(207,224,255,0.4) 50%,transparent 51%),radial-gradient(1px 1px at 68% 9%,rgba(207,224,255,0.45) 50%,transparent 51%),radial-gradient(1.5px 1.5px at 86% 22%,rgba(207,224,255,0.5) 50%,transparent 51%),radial-gradient(1px 1px at 92% 40%,rgba(207,224,255,0.35) 50%,transparent 51%),radial-gradient(1px 1px at 8% 42%,rgba(207,224,255,0.4) 50%,transparent 51%)'
						}}
					>
						<span
							style={{
								position: 'absolute',
								left: '80%',
								top: '12%',
								width: 2,
								height: 2,
								borderRadius: '50%',
								background: '#cfe0ff',
								boxShadow: '0 0 7px 2px rgba(32,217,255,0.45)',
								animation: 'sm-twinkle 4.2s ease-in-out infinite'
							}}
						></span>
						<span
							style={{
								position: 'absolute',
								left: '14%',
								top: '30%',
								width: 3,
								height: 3,
								borderRadius: '50%',
								background: '#cfe0ff',
								boxShadow: '0 0 8px 2px rgba(32,217,255,0.5)',
								animation: 'sm-twinkle 3.6s ease-in-out 1s infinite'
							}}
						></span>
						<span
							style={{
								position: 'absolute',
								left: '60%',
								top: '46%',
								width: 2,
								height: 2,
								borderRadius: '50%',
								background: '#cfe0ff',
								boxShadow: '0 0 7px 2px rgba(255,157,59,0.3)',
								animation: 'sm-twinkle 5s ease-in-out 0.5s infinite'
							}}
						></span>
					</div>

					<div
						className='sm-hero-grid'
						style={{
							position: 'relative',
							zIndex: 10,
							maxWidth: 1440,
							margin: '0 auto',
							minHeight: '100svh',
							boxSizing: 'border-box',
							padding: '100px 64px 64px 80px',
							display: 'grid',
							gridTemplateColumns: '1fr 600px',
							gap: 48,
							alignItems: 'center'
						}}
					>
						<div
							className='sm-hero-copy'
							style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', animation: 'sm-rise 0.7s ease-out both'}}
						>
							<p
								className='sm-hero-badge'
								style={{
									margin: '0 0 24px',
									display: 'inline-flex',
									alignItems: 'baseline',
									gap: 8,
									border: '1px solid rgba(255,255,255,0.15)',
									borderRadius: 999,
									background: 'rgba(3,7,11,0.7)',
									padding: '9px 18px',
									fontSize: 12,
									letterSpacing: '0.04em',
									color: '#8E99AA'
								}}
							>
								Backed by{' '}
								<span role='img' aria-label='Coinbase Ventures' style={{display: 'inline-flex', alignItems: 'baseline', gap: 6}}>
									<svg aria-hidden='true' viewBox='0 0 1101.64 196.79' width={78.4} height={14} style={{display: 'block'}}>
										<path
											fill='#fff'
											d='m222.34 54.94c-40.02 0-71.29 30.38-71.29 71.05s30.48 70.79 71.29 70.79 71.82-30.64 71.82-71.05c0-40.15-30.48-70.79-71.82-70.79zm.27 112.53c-22.79 0-39.49-17.7-39.49-41.47 0-24.04 16.43-41.73 39.22-41.73 23.06 0 39.75 17.96 39.75 41.73s-16.69 41.47-39.48 41.47zm80.29-81.62h19.88v108.3h31.8v-136.57h-51.68zm-231.88-1.59c16.7 0 29.95 10.3 34.98 25.62h33.66c-6.1-32.75-33.13-54.94-68.37-54.94-40.02 0-71.29 30.38-71.29 71.06s30.48 70.79 71.29 70.79c34.45 0 62.01-22.19 68.11-55.21h-33.4c-4.77 15.32-18.02 25.89-34.72 25.89-23.06 0-39.22-17.7-39.22-41.47.01-24.04 15.91-41.74 38.96-41.74zm836.1 28.53-23.32-3.43c-11.13-1.58-19.08-5.28-19.08-14 0-9.51 10.34-14.26 24.38-14.26 15.37 0 25.18 6.6 27.3 17.43h30.74c-3.45-27.47-24.65-43.58-57.24-43.58-33.66 0-55.92 17.17-55.92 41.47 0 23.24 14.58 36.72 43.99 40.94l23.32 3.43c11.4 1.58 17.76 6.08 17.76 14.53 0 10.83-11.13 15.32-26.5 15.32-18.82 0-29.42-7.66-31.01-19.28h-31.27c2.92 26.68 23.85 45.43 62.01 45.43 34.72 0 57.77-15.85 57.77-43.06 0-24.3-16.69-36.98-42.93-40.94zm-568.44-111.47c-11.66 0-20.41 8.45-20.41 20.07s8.74 20.07 20.41 20.07c11.66 0 20.41-8.45 20.41-20.07s-8.75-20.07-20.41-20.07zm466.68 103.02c0-29.58-18.02-49.39-56.18-49.39-36.04 0-56.18 18.23-60.16 46.23h31.54c1.59-10.83 10.07-19.81 28.09-19.81 16.17 0 24.12 7.13 24.12 15.85 0 11.36-14.58 14.26-32.6 16.11-24.38 2.64-54.59 11.09-54.59 42.79 0 24.57 18.29 40.41 47.44 40.41 22.79 0 37.1-9.51 44.26-24.57 1.06 13.47 11.13 22.19 25.18 22.19h18.55v-28.26h-15.64v-61.55zm-31.27 34.34c0 18.23-15.9 31.7-35.25 31.7-11.93 0-22-5.02-22-15.58 0-13.47 16.17-17.17 31.01-18.75 14.31-1.32 22.26-4.49 26.24-10.57zm-168.81-83.74c-17.76 0-32.6 7.4-43.2 19.81v-74.75h-31.8v194.15h31.27v-17.96c10.6 12.94 25.71 20.6 43.73 20.6 38.16 0 67.05-30.11 67.05-70.79s-29.42-71.06-67.05-71.06zm-4.77 112.53c-22.79 0-39.49-17.7-39.49-41.47s16.96-41.73 39.75-41.73c23.06 0 39.22 17.7 39.22 41.73 0 23.77-16.69 41.47-39.48 41.47zm-146.29-112.53c-20.67 0-34.19 8.45-42.14 20.34v-17.7h-31.54v136.56h31.8v-74.22c0-20.87 13.25-35.66 32.86-35.66 18.29 0 29.68 12.94 29.68 31.7v78.19h31.8v-80.56c.01-34.35-17.74-58.65-52.46-58.65zm647.42 66.57c0-39.09-28.62-66.56-67.05-66.56-40.81 0-70.76 30.64-70.76 71.05 0 42.53 32.07 70.79 71.29 70.79 33.13 0 59.1-19.55 65.72-47.28h-33.13c-4.77 12.15-16.43 19.02-32.07 19.02-20.41 0-35.78-12.68-39.22-34.87h105.21v-12.15zm-103.36-10.57c5.04-19.02 19.35-28.26 35.78-28.26 18.02 0 31.8 10.3 34.98 28.26z'
										/>
									</svg>
									<span
										aria-hidden='true'
										style={{fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 400, letterSpacing: '0.08em', lineHeight: 1, color: '#fff'}}
									>
										VENTURES
									</span>
								</span>
							</p>
							<h1
								className='sm-hero-h1'
								style={{
									margin: 0,
									fontFamily: "'Space Grotesk',sans-serif",
									fontWeight: 400,
									fontSize: 'clamp(44px,5.5vw,78px)',
									lineHeight: 1.02,
									letterSpacing: '-0.02em',
									color: '#F5F8FF'
								}}
							>
								Markets for
								<br />
								<span
									style={{
										background: 'linear-gradient(to right,#20D9FF,#0B6BFF)',
										WebkitBackgroundClip: 'text',
										backgroundClip: 'text',
										color: 'transparent',
										display: 'inline-block',
										paddingBottom: '0.06em',
										whiteSpace: 'nowrap'
									}}
								>
									Orbital Assets
								</span>
							</h1>
							<p
								className='sm-hero-sub'
								style={{margin: '24px 0 0', maxWidth: '40ch', fontSize: 18, lineHeight: 1.65, color: '#8E99AA', textWrap: 'pretty'}}
							>
								Price mission risk. Buy and sell orbital capacity. Settle when delivery is verified.
							</p>
							<div className='sm-hero-ctas' style={{display: 'flex', alignItems: 'center', gap: 32, marginTop: 36}}>
								<a
									href='https://markets.spacemarkets.com'
									className='sm-hover-bright-light sm-hero-cta-main'
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										gap: 8,
										borderRadius: 999,
										background: '#0B6BFF',
										color: '#F5F8FF',
										fontSize: 14,
										fontWeight: 500,
										padding: '13px 26px',
										minHeight: 44,
										boxSizing: 'border-box',
										boxShadow: '0 0 28px rgba(11,107,255,0.35)',
										transition: 'filter 0.2s'
									}}
								>
									Explore markets <span aria-hidden='true'>↗</span>
								</a>
								<button
									type='button'
									onClick={v.openContact}
									className='sm-hover-cyan sm-hero-cta-ghost'
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										gap: 8,
										border: 'none',
										background: 'none',
										padding: 0,
										minHeight: 44,
										fontFamily: "'Inter',sans-serif",
										fontSize: 14,
										fontWeight: 500,
										color: 'rgba(245,248,255,0.9)',
										cursor: 'pointer',
										transition: 'color 0.2s'
									}}
								>
									Contact Us <span aria-hidden='true'>→</span>
								</button>
							</div>
						</div>
						<div
							className='sm-hero-globe-col'
							style={{position: 'relative', height: 'min(680px,76svh)', marginLeft: -110, marginRight: -56}}
						>
							{v.isMobile ? (
								<GlobeV2
									key='m'
									framing='ball'
									dawn='1'
									bloom='1.2'
									grain='false'
									zoom='1.08'
									sats='0'
									limb='0'
									style={{position: 'absolute', inset: 0}}
								/>
							) : (
								<GlobeV2 key='d' framing='ball' dawn='1' bloom='1.2' grain='false' zoom='1.22' style={{position: 'absolute', inset: 0}} />
							)}
						</div>
					</div>
				</section>

				{/* PLATE 01 — THE FILM */}
				<section
					id='film'
					data-screen-label='Film'
					className='sm-pad-x'
					style={{position: 'relative', marginTop: 'clamp(96px,10vw,120px)', padding: '0 40px'}}
				>
					<div data-reveal style={{maxWidth: 1200, margin: '0 auto'}}>
						<div
							className='sm-film-head'
							style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28}}
						>
							<div>
								<p
									style={{
										display: 'inline-flex',
										border: '1px solid rgba(255,255,255,0.15)',
										borderRadius: 999,
										background: 'rgba(3,7,11,0.7)',
										padding: '8px 14px',
										margin: 0,
										fontFamily: "'JetBrains Mono',monospace",
										fontSize: 10,
										letterSpacing: '0.22em',
										textTransform: 'uppercase',
										color: '#8E99AA'
									}}
								>
									Plate 01 — The Film
								</p>
								<h2
									style={{
										margin: '20px 0 0',
										fontFamily: "'Space Grotesk',sans-serif",
										fontWeight: 300,
										fontSize: 'clamp(34px,3.6vw,52px)',
										lineHeight: 1.02,
										letterSpacing: '-0.03em',
										color: '#F5F8FF'
									}}
								>
									Orbit, in thirty-four seconds.
								</h2>
							</div>
							<p
								style={{
									margin: 0,
									fontFamily: "'JetBrains Mono',monospace",
									fontSize: 11,
									letterSpacing: '0.18em',
									textTransform: 'uppercase',
									color: '#8E99AA'
								}}
							>
								SPACE MARKETS — A FILM · 2026
							</p>
						</div>

						{v.videoPlaying && (
							<div
								style={{
									position: 'relative',
									aspectRatio: '16/9',
									border: '1px solid rgba(255,255,255,0.15)',
									background: '#000',
									overflow: 'hidden'
								}}
							>
								<video
									src={v.videoSrc}
									controls
									autoPlay
									playsInline
									style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}}
								></video>
							</div>
						)}
						{v.videoIdle && (
							<button
								type='button'
								onClick={v.playFilm}
								aria-label='Play the Space Markets film'
								style={{
									position: 'relative',
									display: 'block',
									width: '100%',
									aspectRatio: '16/9',
									border: '1px solid rgba(255,255,255,0.15)',
									padding: 0,
									background: '#071421',
									cursor: 'pointer',
									overflow: 'hidden',
									textAlign: 'left'
								}}
							>
								<img
									src='/film-poster.jpg'
									alt="Sunrise over Earth's limb from orbit"
									className='sm-hover-zoom'
									style={{
										position: 'absolute',
										inset: 0,
										width: '100%',
										height: '100%',
										objectFit: 'cover',
										opacity: 0.85,
										transition: 'transform 6s ease-out'
									}}
								/>
								<span
									aria-hidden='true'
									style={{
										position: 'absolute',
										inset: 0,
										background: 'linear-gradient(to top,rgba(3,7,11,0.85),rgba(3,7,11,0.15) 45%,rgba(3,7,11,0.35))'
									}}
								></span>
								<span
									className='sm-hover-play'
									style={{
										position: 'absolute',
										top: '50%',
										left: '50%',
										transform: 'translate(-50%,-50%)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										width: 88,
										height: 88,
										borderRadius: '50%',
										border: '1px solid rgba(255,255,255,0.35)',
										background: 'rgba(3,7,11,0.55)',
										backdropFilter: 'blur(8px)',
										WebkitBackdropFilter: 'blur(8px)',
										transition: 'background 0.2s,border-color 0.2s'
									}}
								>
									<span
										aria-hidden='true'
										style={{
											width: 0,
											height: 0,
											borderStyle: 'solid',
											borderWidth: '11px 0 11px 19px',
											borderColor: 'transparent transparent transparent #F5F8FF',
											marginLeft: 5
										}}
									></span>
								</span>
								<span
									style={{
										position: 'absolute',
										left: 28,
										bottom: 24,
										fontFamily: "'JetBrains Mono',monospace",
										fontSize: 11,
										letterSpacing: '0.22em',
										textTransform: 'uppercase',
										color: 'rgba(245,248,255,0.9)'
									}}
								>
									{v.filmCaption}
								</span>
								<span
									style={{
										position: 'absolute',
										right: 28,
										bottom: 24,
										fontFamily: "'JetBrains Mono',monospace",
										fontSize: 11,
										letterSpacing: '0.18em',
										textTransform: 'uppercase',
										color: '#8E99AA'
									}}
								>
									00:34 · Sound on
								</span>
							</button>
						)}
					</div>
				</section>

				{/* PLATE 02 — EVENT MARKETS */}
				<section
					id='events'
					data-screen-label='Event Markets'
					style={{position: 'relative', marginTop: 'clamp(96px,10vw,120px)', overflow: 'hidden'}}
				>
					<img
						src='/event-markets-bg.jpg'
						alt='A satellite deploying above Earth'
						style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', zIndex: 0}}
					/>
					<div
						aria-hidden='true'
						style={{
							position: 'absolute',
							inset: 0,
							zIndex: 1,
							background: 'linear-gradient(to right,rgba(3,7,11,0.95),rgba(3,7,11,0.6) 50%,rgba(3,7,11,0.35))'
						}}
					></div>
					<div
						aria-hidden='true'
						style={{
							position: 'absolute',
							inset: 0,
							zIndex: 1,
							background: 'linear-gradient(to bottom,rgba(3,7,11,0.5),transparent 30%,rgba(3,7,11,0.92) 85%,#03070B)'
						}}
					></div>

					<div
						className='sm-events-wrap'
						style={{
							position: 'relative',
							zIndex: 2,
							maxWidth: 1280,
							margin: '0 auto',
							padding: 'clamp(72px,8vw,110px) 40px clamp(56px,6vw,80px)'
						}}
					>
						<div
							data-reveal
							className='sm-events-head'
							style={{display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', alignItems: 'end', gap: 48}}
						>
							<div>
								<p
									style={{
										display: 'inline-flex',
										border: '1px solid rgba(255,255,255,0.15)',
										borderRadius: 999,
										background: 'rgba(3,7,11,0.7)',
										backdropFilter: 'blur(4px)',
										WebkitBackdropFilter: 'blur(4px)',
										padding: '8px 14px',
										margin: 0,
										fontFamily: "'JetBrains Mono',monospace",
										fontSize: 10,
										letterSpacing: '0.22em',
										textTransform: 'uppercase',
										color: '#8E99AA'
									}}
								>
									Plate 02 — Event Markets
								</p>
								<h2
									style={{
										margin: '20px 0 0',
										maxWidth: '13ch',
										fontFamily: "'Space Grotesk',sans-serif",
										fontWeight: 300,
										fontSize: 'clamp(38px,4.8vw,64px)',
										lineHeight: 0.98,
										letterSpacing: '-0.045em',
										color: '#F5F8FF'
									}}
								>
									Price the events that shape orbit.
								</h2>
							</div>
							<p
								style={{
									margin: '0 0 4px',
									maxWidth: '46ch',
									fontSize: 16,
									lineHeight: 1.65,
									color: 'rgba(245,248,255,0.75)',
									textWrap: 'pretty'
								}}
							>
								Launch windows, deployments, capacity milestones — priced as transparent Yes / No contracts, so operators and counterparties
								share one signal for planning and hedging.
							</p>
						</div>

						<div style={{height: 48}}></div>

						<div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20}}>
							{v.markets.map((m, i) => (
								<div
									key={m.id}
									data-reveal
									className='sm-hover-card'
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: 0,
										border: '1px solid rgba(255,255,255,0.12)',
										borderRadius: 16,
										background: 'rgba(3,7,11,0.78)',
										backdropFilter: 'blur(16px)',
										WebkitBackdropFilter: 'blur(16px)',
										padding: '22px 22px 18px',
										transition: 'border-color 0.2s,background 0.2s',
										animationDelay: `${i * 0.1}s`
									}}
								>
									<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
										<p
											style={{
												margin: 0,
												fontFamily: "'JetBrains Mono',monospace",
												fontSize: 9,
												letterSpacing: '0.2em',
												textTransform: 'uppercase',
												color: '#8E99AA'
											}}
										>
											{m.category}
										</p>
										<p
											style={{
												margin: 0,
												fontFamily: "'JetBrains Mono',monospace",
												fontSize: 9,
												letterSpacing: '0.14em',
												textTransform: 'uppercase',
												color: '#8E99AA'
											}}
										>
											Vol {m.volume}
										</p>
									</div>
									<p
										style={{
											margin: '14px 0 0',
											minHeight: 66,
											fontSize: 15,
											fontWeight: 500,
											lineHeight: 1.45,
											color: '#F5F8FF',
											textWrap: 'pretty'
										}}
									>
										{m.question}
									</p>
									<div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 10}}>
										<div>
											<p
												style={{
													margin: 0,
													fontFamily: "'JetBrains Mono',monospace",
													fontSize: 34,
													fontWeight: 500,
													letterSpacing: '-0.04em',
													lineHeight: 1,
													color: '#F5F8FF',
													fontVariantNumeric: 'tabular-nums'
												}}
											>
												{m.prob}
												<span style={{fontSize: 16, color: '#8E99AA'}}>%</span>
											</p>
											<p
												style={{
													margin: '6px 0 0',
													fontFamily: "'JetBrains Mono',monospace",
													fontSize: 9,
													letterSpacing: '0.16em',
													textTransform: 'uppercase',
													color: '#8E99AA'
												}}
											>
												Chance
											</p>
										</div>
										<svg
											viewBox='0 0 120 36'
											preserveAspectRatio='none'
											aria-hidden='true'
											style={{width: 118, height: 36, overflow: 'visible'}}
										>
											<path d={m.sparkArea} fill={m.sparkFill}></path>
											<path d={m.spark} fill='none' stroke={m.sparkStroke} strokeWidth='1.5' vectorEffect='non-scaling-stroke'></path>
										</svg>
									</div>
									<div style={{display: 'flex', gap: 10, marginTop: 18}}>
										<button
											type='button'
											onClick={m.pickYes}
											className='sm-hover-yes'
											style={{
												flex: 1,
												minHeight: 44,
												borderRadius: 10,
												cursor: 'pointer',
												fontFamily: "'JetBrains Mono',monospace",
												fontSize: 13,
												letterSpacing: '0.06em',
												fontVariantNumeric: 'tabular-nums',
												transition: 'all 0.15s',
												border: `1px solid ${m.yesBorder}`,
												background: m.yesBg,
												color: '#23E6A8'
											}}
										>
											YES {m.yes}¢
										</button>
										<button
											type='button'
											onClick={m.pickNo}
											className='sm-hover-no'
											style={{
												flex: 1,
												minHeight: 44,
												borderRadius: 10,
												cursor: 'pointer',
												fontFamily: "'JetBrains Mono',monospace",
												fontSize: 13,
												letterSpacing: '0.06em',
												fontVariantNumeric: 'tabular-nums',
												transition: 'all 0.15s',
												border: `1px solid ${m.noBorder}`,
												background: m.noBg,
												color: '#FF4D5E'
											}}
										>
											NO {m.no}¢
										</button>
									</div>
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											marginTop: 14,
											paddingTop: 12,
											borderTop: '1px solid rgba(255,255,255,0.08)'
										}}
									>
										<p
											style={{
												margin: 0,
												fontFamily: "'JetBrains Mono',monospace",
												fontSize: 9,
												letterSpacing: '0.14em',
												textTransform: 'uppercase',
												color: '#8E99AA'
											}}
										>
											Resolves {m.resolves}
										</p>
										<p
											style={{
												margin: 0,
												fontFamily: "'JetBrains Mono',monospace",
												fontSize: 9,
												letterSpacing: '0.14em',
												textTransform: 'uppercase',
												color: m.stateColor
											}}
										>
											{m.stateLabel}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* PLATE 03 — ASSET LEASING */}
				<section
					id='markets'
					data-screen-label='Asset Leasing'
					className='sm-pad-x'
					style={{marginTop: 'clamp(96px,10vw,120px)', padding: '0 40px'}}
				>
					<div
						className='sm-leasing-grid'
						style={{maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', alignItems: 'center', gap: 48}}
					>
						<div data-reveal>
							<p
								style={{
									display: 'inline-flex',
									border: '1px solid rgba(255,255,255,0.15)',
									borderRadius: 999,
									background: 'rgba(3,7,11,0.7)',
									padding: '8px 14px',
									margin: 0,
									fontFamily: "'JetBrains Mono',monospace",
									fontSize: 10,
									letterSpacing: '0.22em',
									textTransform: 'uppercase',
									color: '#8E99AA'
								}}
							>
								Plate 03 — Asset Leasing Markets
							</p>
							<h2
								style={{
									margin: '20px 0 0',
									maxWidth: '13ch',
									fontFamily: "'Space Grotesk',sans-serif",
									fontWeight: 300,
									fontSize: 'clamp(38px,4.3vw,58px)',
									lineHeight: 0.98,
									letterSpacing: '-0.04em',
									color: '#F5F8FF'
								}}
							>
								Lease the capacity behind every mission.
							</h2>
							<p style={{margin: '24px 0 0', maxWidth: '46ch', fontSize: 17, lineHeight: 1.65, color: '#8E99AA', textWrap: 'pretty'}}>
								Asset Leasing Markets connect infrastructure operators with teams that need capacity. Buyers reserve verified services under
								clear commercial terms, and payment is released after delivery is confirmed.
							</p>
							<div style={{marginTop: 32}}>
								<p
									style={{
										margin: 0,
										fontFamily: "'JetBrains Mono',monospace",
										fontSize: 9,
										letterSpacing: '0.18em',
										textTransform: 'uppercase',
										color: '#8E99AA'
									}}
								>
									Available capacity
								</p>
								<div style={{marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)'}}>
									{v.capacity.map((c) => (
										<div
											key={c.index}
											style={{
												display: 'grid',
												gridTemplateColumns: '2.5rem 1fr auto',
												alignItems: 'center',
												gap: '0 12px',
												padding: '14px 0',
												borderBottom: '1px solid rgba(255,255,255,0.1)'
											}}
										>
											<span style={{fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#8E99AA'}}>{c.index}</span>
											<span style={{fontSize: 14, color: '#F5F8FF'}}>{c.name}</span>
											<span
												style={{
													fontFamily: "'JetBrains Mono',monospace",
													fontSize: 8,
													letterSpacing: '0.12em',
													textTransform: 'uppercase',
													color: '#8E99AA',
													textAlign: 'right'
												}}
											>
												{c.meta}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
						<figure
							data-reveal
							className='sm-leasing-figure'
							style={{
								position: 'relative',
								minHeight: 480,
								margin: 0,
								overflow: 'hidden',
								background: '#071421',
								border: '1px solid rgba(255,255,255,0.15)',
								animationDelay: '0.1s'
							}}
						>
							<img
								src='/leasing-orbit.jpg'
								alt='City lights and the atmosphere seen from low Earth orbit'
								style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}}
							/>
							<div
								aria-hidden='true'
								style={{position: 'absolute', inset: 0, background: 'linear-gradient(to top,#03070B,rgba(3,7,11,0.2) 55%,transparent)'}}
							></div>
							<figcaption style={{position: 'absolute', left: 0, right: 0, bottom: 0, padding: 32}}>
								<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16}}>
									<p
										style={{
											margin: 0,
											fontFamily: "'JetBrains Mono',monospace",
											fontSize: 9,
											letterSpacing: '0.18em',
											textTransform: 'uppercase',
											color: '#8E99AA'
										}}
									>
										Illustrative lease
									</p>
									<span
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 8,
											fontFamily: "'JetBrains Mono',monospace",
											fontSize: 8,
											letterSpacing: '0.14em',
											textTransform: 'uppercase',
											color: '#23E6A8'
										}}
									>
										<span
											aria-hidden='true'
											style={{
												width: 6,
												height: 6,
												borderRadius: '50%',
												background: '#23E6A8',
												animation: 'sm-pulse 2.4s ease-in-out infinite'
											}}
										></span>
										Available
									</span>
								</div>
								<h3
									style={{
										margin: '16px 0 0',
										fontFamily: "'Space Grotesk',sans-serif",
										fontWeight: 300,
										fontSize: 30,
										letterSpacing: '-0.025em',
										color: '#F5F8FF'
									}}
								>
									Ground-station access
								</h3>
								<dl style={{margin: '20px 0 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
									<div>
										<dt
											style={{
												fontFamily: "'JetBrains Mono',monospace",
												fontSize: 8,
												letterSpacing: '0.15em',
												textTransform: 'uppercase',
												color: '#8E99AA'
											}}
										>
											Capacity
										</dt>
										<dd style={{margin: '6px 0 0', fontSize: 14, color: '#F5F8FF'}}>14 scheduled passes</dd>
									</div>
									<div>
										<dt
											style={{
												fontFamily: "'JetBrains Mono',monospace",
												fontSize: 8,
												letterSpacing: '0.15em',
												textTransform: 'uppercase',
												color: '#8E99AA'
											}}
										>
											Terms
										</dt>
										<dd style={{margin: '6px 0 0', fontSize: 14, lineHeight: 1.4, color: '#F5F8FF'}}>
											Reserved now · Settles after verified delivery
										</dd>
									</div>
								</dl>
							</figcaption>
						</figure>
					</div>
				</section>

				{/* PLATE 04 — AGENTS */}
				<section
					id='agents'
					data-screen-label='Agents'
					className='sm-pad-x'
					style={{marginTop: 'clamp(96px,10vw,120px)', padding: '0 40px'}}
				>
					<div style={{maxWidth: 1280, margin: '0 auto'}}>
						<div data-reveal>
							<p
								style={{
									display: 'inline-flex',
									border: '1px solid rgba(255,255,255,0.15)',
									borderRadius: 999,
									background: 'rgba(3,7,11,0.7)',
									padding: '8px 14px',
									margin: 0,
									fontFamily: "'JetBrains Mono',monospace",
									fontSize: 10,
									letterSpacing: '0.22em',
									textTransform: 'uppercase',
									color: '#8E99AA'
								}}
							>
								Plate 04 — Built for Agents
							</p>
							<h2
								style={{
									margin: '20px 0 0',
									maxWidth: '15ch',
									fontFamily: "'Space Grotesk',sans-serif",
									fontWeight: 300,
									fontSize: 'clamp(38px,4.3vw,58px)',
									lineHeight: 0.98,
									letterSpacing: '-0.04em',
									color: '#F5F8FF'
								}}
							>
								Markets built for agents.
							</h2>
							<p style={{margin: '24px 0 0', maxWidth: '62ch', fontSize: 17, lineHeight: 1.65, color: '#8E99AA', textWrap: 'pretty'}}>
								Space Markets enables specialized agents to discover infrastructure capacity, evaluate mission risk, submit bids, assemble
								service packages and coordinate programmable settlement. Agents operate under participant-defined mandates, connecting
								market intelligence with real economic activity across launch, communications, compute, power and lunar operations.
							</p>
						</div>
						<div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20, marginTop: 40}}>
							{v.agents.map((a, i) => (
								<div
									key={a.index}
									data-reveal
									className='sm-hover-card'
									style={{
										display: 'flex',
										flexDirection: 'column',
										border: '1px solid rgba(255,255,255,0.12)',
										borderRadius: 16,
										background: 'rgba(3,7,11,0.78)',
										padding: '22px 22px 24px',
										transition: 'border-color 0.2s,background 0.2s',
										animationDelay: `${i * 0.1}s`
									}}
								>
									<p style={{margin: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.1em', color: '#8E99AA'}}>
										{a.index}
									</p>
									<h3
										style={{
											margin: '18px 0 0',
											fontFamily: "'Space Grotesk',sans-serif",
											fontWeight: 300,
											fontSize: 22,
											letterSpacing: '-0.02em',
											color: '#F5F8FF'
										}}
									>
										{a.title}
									</h3>
									<p style={{margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#8E99AA', textWrap: 'pretty'}}>{a.line}</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* PLATE 05 — SMI */}
				<section id='smi' data-screen-label='SMI' style={{position: 'relative', marginTop: 'clamp(96px,10vw,120px)', overflow: 'hidden'}}>
					<div className='sm-smi-grid' style={{display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 760}}>
						<div data-reveal className='sm-smi-orb-col' style={{position: 'relative'}}>
							<div style={{position: 'absolute', left: '-80%', top: '50%', transform: 'translateY(-50%)', width: '150%', aspectRatio: '1'}}>
								<div style={{position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '50%'}}>
									<img
										src='/smi-black-marble.jpg'
										alt='Black Marble composite of Asia at night — city lights seen from orbit. Image: NASA Earth Observatory.'
										style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.9)'}}
									/>
								</div>
								<div
									aria-hidden='true'
									style={{
										position: 'absolute',
										inset: 0,
										borderRadius: '50%',
										boxShadow: 'inset -48px 0 120px -32px rgba(32,217,255,0.25), 24px 0 90px -36px rgba(32,217,255,0.12)'
									}}
								></div>
								<svg aria-hidden='true' viewBox='0 0 100 100' style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
									<line
										x1='63'
										y1='16'
										x2='95.5'
										y2='23.7'
										stroke='rgba(245,248,255,0.22)'
										strokeWidth='1'
										vectorEffect='non-scaling-stroke'
									></line>
								</svg>
								<p
									style={{
										position: 'absolute',
										left: '63%',
										top: '16%',
										transform: 'translateY(-140%)',
										margin: 0,
										whiteSpace: 'nowrap',
										fontFamily: "'JetBrains Mono',monospace",
										fontSize: 10,
										letterSpacing: '0.2em',
										textTransform: 'uppercase',
										color: '#8E99AA'
									}}
								>
									SMI Constituent — Orbital Compute, 550 km
								</p>
								<span
									aria-hidden='true'
									style={{
										position: 'absolute',
										left: '95.5%',
										top: '23.7%',
										width: 6,
										height: 6,
										margin: '-3px 0 0 -3px',
										borderRadius: '50%',
										background: '#FF9D3B',
										boxShadow: '0 0 10px 2px rgba(255,157,59,0.7)'
									}}
								></span>
							</div>
						</div>
						<div className='sm-smi-content' style={{position: 'relative', padding: 'clamp(64px,7vw,96px) 80px clamp(64px,7vw,96px) 24px'}}>
							<div data-reveal style={{maxWidth: 640, animationDelay: '0.1s'}}>
								<p
									style={{
										display: 'inline-flex',
										border: '1px solid rgba(255,255,255,0.15)',
										borderRadius: 999,
										background: 'rgba(3,7,11,0.7)',
										padding: '8px 14px',
										margin: 0,
										fontFamily: "'JetBrains Mono',monospace",
										fontSize: 10,
										letterSpacing: '0.22em',
										textTransform: 'uppercase',
										color: '#8E99AA'
									}}
								>
									Plate 05 — Benchmark Intelligence
								</p>
								<h2
									style={{
										margin: '32px 0 0',
										maxWidth: '15ch',
										fontFamily: "'Space Grotesk',sans-serif",
										fontWeight: 400,
										fontSize: 'clamp(30px,3.4vw,48px)',
										lineHeight: 1.05,
										letterSpacing: '-0.02em',
										color: '#F5F8FF'
									}}
								>
									Benchmark intelligence for orbital capacity.
								</h2>
								<p
									className='sm-smi-value'
									style={{
										margin: '40px 0 0',
										whiteSpace: 'nowrap',
										fontFamily: "'JetBrains Mono',monospace",
										fontWeight: 500,
										fontSize: 'clamp(88px,9vw,148px)',
										lineHeight: 1,
										letterSpacing: '-0.055em',
										color: '#F5F8FF',
										fontVariantNumeric: 'tabular-nums'
									}}
								>
									{v.smiValue}
								</p>
								<div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 16}}>
									<span
										style={{
											display: 'inline-flex',
											alignItems: 'center',
											border: `1px solid ${v.smiDeltaBorder}`,
											background: v.smiDeltaBg,
											color: v.smiDeltaColor,
											borderRadius: 999,
											padding: '4px 10px',
											fontFamily: "'JetBrains Mono',monospace",
											fontSize: 12,
											fontVariantNumeric: 'tabular-nums'
										}}
									>
										{v.smiDelta}
									</span>
									<span
										style={{
											fontFamily: "'JetBrains Mono',monospace",
											fontSize: 11,
											letterSpacing: '0.22em',
											textTransform: 'uppercase',
											color: '#8E99AA'
										}}
									>
										{v.smiTicker} • 30D
									</span>
								</div>
								<svg
									viewBox='0 0 480 168'
									preserveAspectRatio='none'
									role='img'
									aria-label='SMI 30-day line chart, illustrative'
									style={{display: 'block', width: '100%', height: 160, marginTop: 40}}
								>
									<defs>
										<linearGradient id='smi-area' x1='0' y1='0' x2='0' y2='1'>
											<stop offset='0%' stopColor='#20D9FF' stopOpacity='0.22'></stop>
											<stop offset='100%' stopColor='#20D9FF' stopOpacity='0'></stop>
										</linearGradient>
									</defs>
									<path d={v.smiAreaPath} fill='url(#smi-area)'></path>
									<path
										d={v.smiPath}
										fill='none'
										stroke='#20D9FF'
										strokeWidth='1.5'
										strokeLinecap='round'
										strokeLinejoin='round'
										vectorEffect='non-scaling-stroke'
									></path>
								</svg>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										marginTop: 8,
										fontFamily: "'JetBrains Mono',monospace",
										fontSize: 10,
										letterSpacing: '0.22em',
										textTransform: 'uppercase',
										color: '#8E99AA'
									}}
								>
									<span>T-30D</span>
									<span>NOW</span>
								</div>
								<div
									style={{marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)'}}
									onMouseLeave={v.smiClear}
								>
									{v.sectors.map((s) => (
										<button
											key={s.ticker}
											type='button'
											onMouseEnter={s.enter}
											onClick={s.enter}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: 16,
												width: '100%',
												border: 'none',
												borderBottom: '1px solid rgba(255,255,255,0.1)',
												background: s.rowBg,
												padding: '15px 8px',
												cursor: 'pointer',
												textAlign: 'left',
												fontFamily: "'JetBrains Mono',monospace",
												transition: 'background 0.2s'
											}}
										>
											<span style={{width: 56, flexShrink: 0, fontSize: 12, letterSpacing: '0.22em', color: s.tickerColor}}>
												{s.ticker}
											</span>
											<span style={{flex: 1}}></span>
											<span style={{fontSize: 14, color: '#F5F8FF', fontVariantNumeric: 'tabular-nums'}}>{s.display}</span>
											<span
												style={{
													width: 64,
													flexShrink: 0,
													textAlign: 'right',
													fontSize: 14,
													fontVariantNumeric: 'tabular-nums',
													color: s.deltaColor
												}}
											>
												{s.delta}
											</span>
										</button>
									))}
								</div>
								<p style={{margin: '32px 0 0', maxWidth: '40ch', fontSize: 16, lineHeight: 1.65, color: '#8E99AA'}}>
									A benchmark view of how capacity, demand, and mission activity are moving across the orbital economy.
								</p>
								<div
									style={{
										display: 'flex',
										flexWrap: 'wrap',
										alignItems: 'baseline',
										justifyContent: 'flex-end',
										gap: '4px 12px',
										marginTop: 48
									}}
								>
									<p
										style={{
											margin: 0,
											fontFamily: "'JetBrains Mono',monospace",
											fontSize: 11,
											letterSpacing: '0.18em',
											textTransform: 'uppercase',
											color: '#8E99AA'
										}}
									>
										Benchmark Intelligence · 7 Sectors
									</p>
									<a
										href='#disclosures'
										className='sm-hover-light'
										style={{
											fontFamily: "'JetBrains Mono',monospace",
											fontSize: 11,
											letterSpacing: '0.14em',
											color: '#8E99AA',
											textDecoration: 'underline',
											textDecorationColor: 'rgba(255,255,255,0.2)',
											textUnderlineOffset: 4
										}}
									>
										† illustrative data
									</a>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* PLATE 06 — PARTICIPANTS */}
				<section id='infrastructure' data-screen-label='Participants' style={{marginTop: 'clamp(96px,10vw,120px)', overflow: 'hidden'}}>
					<div
						style={{position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '60svh'}}
					>
						<img
							src='/participants-iss.jpg'
							alt='Copper-toned solar arrays of the International Space Station above a darkened night ocean'
							style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}}
						/>
						<div
							aria-hidden='true'
							style={{position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(3,7,11,0.45),transparent 40%,#03070B)'}}
						></div>
						<div
							data-reveal
							className='sm-part-top'
							style={{
								position: 'relative',
								maxWidth: 1280,
								margin: '0 auto',
								width: '100%',
								padding: '110px 40px 0',
								boxSizing: 'border-box'
							}}
						>
							<p
								style={{
									display: 'inline-flex',
									border: '1px solid rgba(255,255,255,0.15)',
									borderRadius: 999,
									background: 'rgba(3,7,11,0.7)',
									backdropFilter: 'blur(4px)',
									WebkitBackdropFilter: 'blur(4px)',
									padding: '8px 14px',
									margin: 0,
									fontFamily: "'JetBrains Mono',monospace",
									fontSize: 10,
									letterSpacing: '0.22em',
									textTransform: 'uppercase',
									color: '#8E99AA'
								}}
							>
								Plate 06 — Who It's For
							</p>
						</div>
						<div
							data-reveal
							className='sm-part-h2'
							style={{
								position: 'relative',
								maxWidth: 1280,
								margin: '0 auto',
								width: '100%',
								padding: '0 40px 60px',
								boxSizing: 'border-box'
							}}
						>
							<h2
								style={{
									margin: 0,
									maxWidth: '13ch',
									fontFamily: "'Space Grotesk',sans-serif",
									fontWeight: 300,
									fontSize: 'clamp(44px,6vw,82px)',
									lineHeight: 0.98,
									letterSpacing: '-0.04em',
									color: '#F5F8FF'
								}}
							>
								Built for the orbital economy.
							</h2>
						</div>
					</div>
					<div className='sm-part-body' style={{maxWidth: 1280, margin: '0 auto', padding: '60px 40px 0', boxSizing: 'border-box'}}>
						<p data-reveal style={{margin: 0, maxWidth: '60ch', fontSize: 17, lineHeight: 1.65, color: '#8E99AA'}}>
							A shared market layer for the teams supplying, buying, financing, and building orbital infrastructure.
						</p>
						<div style={{marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
							{v.roles.map((r, i) => (
								<div
									key={r.index}
									data-reveal
									className='sm-role-row'
									style={{
										display: 'grid',
										gridTemplateColumns: '3.5rem 0.8fr 1.2fr',
										alignItems: 'center',
										gap: '0 16px',
										padding: '20px 0',
										borderBottom: '1px solid rgba(255,255,255,0.1)',
										animationDelay: `${i * 0.06}s`
									}}
								>
									<span style={{fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8E99AA'}}>{r.index}</span>
									<h3
										style={{
											margin: 0,
											fontFamily: "'Space Grotesk',sans-serif",
											fontWeight: 300,
											fontSize: 24,
											letterSpacing: '-0.02em',
											color: '#F5F8FF'
										}}
									>
										{r.role}
									</h3>
									<p className='sm-role-line' style={{margin: 0, fontSize: 14, lineHeight: 1.6, color: '#8E99AA'}}>
										{r.line}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* FAQ */}
				<section
					id='faq'
					data-screen-label='FAQ'
					className='sm-pad-x'
					style={{marginTop: 'clamp(104px,11vw,140px)', marginBottom: 'clamp(104px,11vw,140px)', padding: '0 40px'}}
				>
					<div
						className='sm-faq-grid'
						style={{maxWidth: 1152, margin: '0 auto', display: 'grid', gridTemplateColumns: '0.75fr 1.25fr', gap: 80}}
					>
						<div data-reveal>
							<p
								style={{
									margin: 0,
									fontFamily: "'JetBrains Mono',monospace",
									fontSize: 10,
									letterSpacing: '0.2em',
									textTransform: 'uppercase',
									color: '#8E99AA'
								}}
							>
								FAQ
							</p>
							<h2
								style={{
									margin: '20px 0 0',
									maxWidth: '10ch',
									fontFamily: "'Space Grotesk',sans-serif",
									fontWeight: 300,
									fontSize: 'clamp(34px,4vw,52px)',
									lineHeight: 1.02,
									letterSpacing: '-0.02em',
									color: '#F5F8FF'
								}}
							>
								Common questions.
							</h2>
						</div>
						<div data-reveal style={{borderTop: '1px solid rgba(255,255,255,0.1)', animationDelay: '0.1s'}}>
							{v.faqs.map((f, i) => (
								<div key={i} style={{borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
									<button
										type='button'
										onClick={f.toggle}
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											gap: 24,
											width: '100%',
											minHeight: 44,
											border: 'none',
											background: 'none',
											padding: '20px 8px',
											cursor: 'pointer',
											textAlign: 'left'
										}}
									>
										<span
											style={{
												fontFamily: "'Space Grotesk',sans-serif",
												fontSize: 20,
												letterSpacing: '-0.01em',
												color: '#F5F8FF',
												transition: 'color 0.2s'
											}}
										>
											{f.q}
										</span>
										<span
											aria-hidden='true'
											style={{flexShrink: 0, fontSize: 18, color: '#8E99AA', transition: 'transform 0.2s', transform: f.iconTransform}}
										>
											+
										</span>
									</button>
									{f.open && (
										<p style={{margin: 0, maxWidth: '60ch', padding: '0 8px 24px', fontSize: 15, lineHeight: 1.65, color: '#8E99AA'}}>
											{f.a}
										</p>
									)}
								</div>
							))}
						</div>
					</div>
				</section>

				{/* PLATE 07 — FINAL CTA */}
				<section
					id='request-access'
					data-screen-label='Final CTA'
					className='sm-pad-x'
					style={{marginTop: 'clamp(96px,10vw,120px)', padding: '0 40px'}}
				>
					<div
						data-reveal
						className='sm-cta-card'
						style={{
							position: 'relative',
							maxWidth: 1152,
							margin: '0 auto',
							overflow: 'hidden',
							borderRadius: 16,
							border: '1px solid rgba(255,255,255,0.1)',
							padding: '80px 64px',
							textAlign: 'center'
						}}
					>
						<img
							src='/cta-twilight.jpg'
							alt="Earth's blue atmosphere at twilight with a crescent moon above the limb"
							style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 34%'}}
						/>
						<div
							aria-hidden='true'
							style={{
								position: 'absolute',
								inset: 0,
								background: 'linear-gradient(to bottom,rgba(3,7,11,0.95),rgba(3,7,11,0.75) 50%,rgba(3,7,11,0.25))'
							}}
						></div>
						<div
							style={{
								position: 'relative',
								maxWidth: 720,
								margin: '0 auto',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 24
							}}
						>
							<p
								style={{
									display: 'inline-flex',
									border: '1px solid rgba(255,255,255,0.15)',
									borderRadius: 999,
									background: 'rgba(3,7,11,0.7)',
									backdropFilter: 'blur(4px)',
									WebkitBackdropFilter: 'blur(4px)',
									padding: '8px 14px',
									margin: 0,
									fontFamily: "'JetBrains Mono',monospace",
									fontSize: 10,
									letterSpacing: '0.22em',
									textTransform: 'uppercase',
									color: '#8E99AA'
								}}
							>
								Plate 07 — Private Beta
							</p>
							<h2
								style={{
									margin: 0,
									fontFamily: "'Space Grotesk',sans-serif",
									fontWeight: 300,
									fontSize: 'clamp(36px,5vw,58px)',
									lineHeight: 1.02,
									letterSpacing: '-0.02em',
									color: '#F5F8FF'
								}}
							>
								Join the private beta.
							</h2>
							<p style={{margin: 0, maxWidth: '52ch', fontSize: 17, lineHeight: 1.65, color: '#8E99AA'}}>
								We're inviting operators, buyers, and builders shaping the orbital economy.
							</p>
							<button
								type='button'
								onClick={v.openContact}
								className='sm-hover-bright'
								style={{
									display: 'inline-flex',
									alignItems: 'center',
									gap: 8,
									marginTop: 8,
									border: 'none',
									borderRadius: 999,
									background: '#0B6BFF',
									color: '#F5F8FF',
									fontFamily: "'Inter',sans-serif",
									fontSize: 14,
									fontWeight: 500,
									padding: '13px 26px',
									minHeight: 44,
									cursor: 'pointer',
									boxShadow: '0 0 28px rgba(11,107,255,0.35)',
									transition: 'filter 0.2s'
								}}
							>
								Contact Us <span aria-hidden='true'>↗</span>
							</button>
						</div>
					</div>
				</section>

				{/* FOOTER */}
				<footer
					className='sm-footer'
					style={{marginTop: 'clamp(96px,10vw,120px)', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '48px 40px 64px'}}
				>
					<div data-reveal style={{maxWidth: 1152, margin: '0 auto'}}>
						<div style={{display: 'flex', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap'}}>
							<div>
								<img src='/space-markets-logo.svg' alt='Space Markets' style={{height: 26, width: 'auto'}} />
								<p style={{margin: '20px 0 0', maxWidth: '44ch', fontSize: 14, lineHeight: 1.65, color: '#8E99AA'}}>
									Price and hedge mission-critical events. Lease the orbital capacity behind them.
								</p>
							</div>
							<div className='sm-footer-cols' style={{display: 'flex', gap: 64}}>
								<div>
									<p
										style={{
											margin: 0,
											fontFamily: "'JetBrains Mono',monospace",
											fontSize: 11,
											letterSpacing: '0.18em',
											textTransform: 'uppercase',
											color: '#8E99AA'
										}}
									>
										Platform
									</p>
									<div style={{display: 'flex', flexDirection: 'column', marginTop: 8}}>
										<a href='#events' className='sm-hover-light' style={{padding: '10px 0', fontSize: 14, color: '#8E99AA'}}>
											Event Markets
										</a>
										<a href='#markets' className='sm-hover-light' style={{padding: '10px 0', fontSize: 14, color: '#8E99AA'}}>
											Asset Leasing Markets
										</a>
										<a href='#smi' className='sm-hover-light' style={{padding: '10px 0', fontSize: 14, color: '#8E99AA'}}>
											SMI
										</a>
									</div>
								</div>
								<div>
									<p
										style={{
											margin: 0,
											fontFamily: "'JetBrains Mono',monospace",
											fontSize: 11,
											letterSpacing: '0.18em',
											textTransform: 'uppercase',
											color: '#8E99AA'
										}}
									>
										Company
									</p>
									<div style={{display: 'flex', flexDirection: 'column', marginTop: 8}}>
										<a href='#infrastructure' className='sm-hover-light' style={{padding: '10px 0', fontSize: 14, color: '#8E99AA'}}>
											Participants
										</a>
										<a href='#faq' className='sm-hover-light' style={{padding: '10px 0', fontSize: 14, color: '#8E99AA'}}>
											FAQ
										</a>
										<a href='#request-access' className='sm-hover-light' style={{padding: '10px 0', fontSize: 14, color: '#8E99AA'}}>
											Contact Us
										</a>
									</div>
								</div>
							</div>
						</div>
						<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 48}}>
							<p style={{margin: 0, fontSize: 12, color: '#8E99AA'}}>© 2026 Space Markets. All rights reserved.</p>
							<a
								href='https://x.com/SpaceMarketsHQ'
								target='_blank'
								rel='noopener noreferrer'
								className='sm-hover-light'
								style={{display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, fontSize: 12, color: '#8E99AA'}}
							>
								<svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' style={{width: 16, height: 16}}>
									<path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z'></path>
								</svg>
								Follow Space Markets on X
							</a>
						</div>
						<span id='disclosures' aria-hidden='true'></span>
					</div>
				</footer>

				{/* CONTACT MODAL */}
				{v.contactOpen && (
					<div
						role='dialog'
						aria-modal='true'
						aria-label='Contact Us'
						style={{
							position: 'fixed',
							inset: 0,
							zIndex: 100,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: 24,
							background: 'rgba(3,7,11,0.8)',
							backdropFilter: 'blur(12px)',
							WebkitBackdropFilter: 'blur(12px)'
						}}
						onClick={v.closeContact}
					>
						<div
							style={{
								width: '100%',
								maxWidth: 480,
								borderRadius: 16,
								border: '1px solid rgba(255,255,255,0.1)',
								background: 'rgba(3,7,11,0.95)',
								backdropFilter: 'blur(24px)',
								WebkitBackdropFilter: 'blur(24px)',
								overflow: 'hidden'
							}}
							onClick={v.stopProp}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									gap: 16,
									padding: '16px 24px',
									borderBottom: '1px solid rgba(255,255,255,0.1)'
								}}
							>
								<p
									style={{
										margin: 0,
										fontFamily: "'JetBrains Mono',monospace",
										fontSize: 10,
										letterSpacing: '0.22em',
										textTransform: 'uppercase',
										color: '#8E99AA'
									}}
								>
									Contact Us — Private Beta
								</p>
								<button
									type='button'
									onClick={v.closeContact}
									aria-label='Close'
									className='sm-hover-light'
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										width: 44,
										height: 44,
										margin: '-10px -14px -10px 0',
										border: 'none',
										background: 'none',
										color: '#8E99AA',
										fontSize: 20,
										cursor: 'pointer'
									}}
								>
									×
								</button>
							</div>
							{v.contactSubmitted && (
								<div style={{padding: '40px 24px', textAlign: 'center'}}>
									<p style={{margin: 0, fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 300, color: '#F5F8FF'}}>
										Request received.
									</p>
									<p style={{margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: '#8E99AA'}}>
										We&apos;ll be in touch as invitations open.
									</p>
								</div>
							)}
							{v.contactFormVisible && (
								<div style={{display: 'flex', flexDirection: 'column', gap: 16, padding: 24}}>
									<div>
										<label
											htmlFor='cm-name'
											style={{
												display: 'block',
												fontFamily: "'JetBrains Mono',monospace",
												fontSize: 11,
												letterSpacing: '0.18em',
												textTransform: 'uppercase',
												color: '#8E99AA',
												marginBottom: 8
											}}
										>
											Name
										</label>
										<input
											id='cm-name'
											type='text'
											placeholder='Ada Chen'
											className='sm-focus-input'
											style={{
												width: '100%',
												boxSizing: 'border-box',
												borderRadius: 12,
												border: '1px solid rgba(255,255,255,0.1)',
												background: 'rgba(255,255,255,0.05)',
												padding: '12px 16px',
												color: '#F5F8FF',
												fontFamily: "'Inter',sans-serif",
												fontSize: 14,
												outline: 'none'
											}}
										/>
									</div>
									<div>
										<label
											htmlFor='cm-email'
											style={{
												display: 'block',
												fontFamily: "'JetBrains Mono',monospace",
												fontSize: 11,
												letterSpacing: '0.18em',
												textTransform: 'uppercase',
												color: '#8E99AA',
												marginBottom: 8
											}}
										>
											Work email
										</label>
										<input
											id='cm-email'
											type='email'
											placeholder='ada@operator.com'
											className='sm-focus-input'
											style={{
												width: '100%',
												boxSizing: 'border-box',
												borderRadius: 12,
												border: '1px solid rgba(255,255,255,0.1)',
												background: 'rgba(255,255,255,0.05)',
												padding: '12px 16px',
												color: '#F5F8FF',
												fontFamily: "'Inter',sans-serif",
												fontSize: 14,
												outline: 'none'
											}}
										/>
									</div>
									<div>
										<label
											htmlFor='cm-org'
											style={{
												display: 'block',
												fontFamily: "'JetBrains Mono',monospace",
												fontSize: 11,
												letterSpacing: '0.18em',
												textTransform: 'uppercase',
												color: '#8E99AA',
												marginBottom: 8
											}}
										>
											Organization · Role
										</label>
										<input
											id='cm-org'
											type='text'
											placeholder='Operator · Buyer · Capital · Builder'
											className='sm-focus-input'
											style={{
												width: '100%',
												boxSizing: 'border-box',
												borderRadius: 12,
												border: '1px solid rgba(255,255,255,0.1)',
												background: 'rgba(255,255,255,0.05)',
												padding: '12px 16px',
												color: '#F5F8FF',
												fontFamily: "'Inter',sans-serif",
												fontSize: 14,
												outline: 'none'
											}}
										/>
									</div>
									<button
										type='button'
										onClick={v.submitContact}
										className='sm-hover-submit'
										style={{
											marginTop: 8,
											minHeight: 44,
											border: 'none',
											borderRadius: 999,
											background: '#F5F8FF',
											color: '#03070B',
											fontFamily: "'Inter',sans-serif",
											fontSize: 14,
											fontWeight: 500,
											cursor: 'pointer',
											transition: 'background 0.2s'
										}}
									>
										Submit request
									</button>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		);
	}
}
