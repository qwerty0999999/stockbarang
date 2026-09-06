<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		variant?: 'header' | 'badge' | 'card' | 'inline';
		showDate?: boolean;
		showTime?: boolean;
		showSeconds?: boolean;
		showTimezone?: boolean;
	}

	let {
		variant = 'header',
		showDate = true,
		showTime = true,
		showSeconds = true,
		showTimezone = true
	}: Props = $props();

	let now = $state<Date>(new Date());

	onMount(() => {
		now = new Date();
		const interval = setInterval(() => {
			now = new Date();
		}, 1000);
		return () => clearInterval(interval);
	});

	const dayName = $derived(
		now.toLocaleDateString('id-ID', { weekday: 'long' })
	);

	const dateFull = $derived(
		now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
	);

	const dateShort = $derived(
		now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
	);

	const hours = $derived(String(now.getHours()).padStart(2, '0'));
	const minutes = $derived(String(now.getMinutes()).padStart(2, '0'));
	const seconds = $derived(String(now.getSeconds()).padStart(2, '0'));

	const timeStr = $derived(
		showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`
	);

	const tzInfo = $derived.by(() => {
		const offset = -now.getTimezoneOffset() / 60;
		if (offset === 7) return { code: 'WIB', label: 'Waktu Indonesia Barat (UTC+7)' };
		if (offset === 8) return { code: 'WITA', label: 'Waktu Indonesia Tengah (UTC+8)' };
		if (offset === 9) return { code: 'WIT', label: 'Waktu Indonesia Timur (UTC+9)' };
		const str = offset >= 0 ? `UTC+${offset}` : `UTC${offset}`;
		return { code: str, label: `Zona Waktu (${str})` };
	});
</script>

{#if variant === 'header'}
	<div
		class="live-clock-header"
		title={`Waktu Sistem: ${dayName}, ${dateFull} - ${timeStr} ${tzInfo.code}`}
		role="timer"
		aria-live="off"
	>
		{#if showDate}
			<div class="clock-item date-section">
				<svg class="clock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<span class="date-full">{dayName}, {dateFull}</span>
				<span class="date-short">{dateShort}</span>
			</div>
		{/if}

		{#if showDate && showTime}
			<span class="clock-divider" aria-hidden="true">|</span>
		{/if}

		{#if showTime}
			<div class="clock-item time-section">
				<svg class="clock-icon clock-rotate" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="time-digits">{timeStr}</span>
				{#if showTimezone}
					<span class="tz-badge">{tzInfo.code}</span>
				{/if}
			</div>
		{/if}
	</div>

{:else if variant === 'card'}
	<div class="live-clock-card">
		<div class="clock-card-header">
			<div class="flex items-center gap-2">
				<svg class="w-4 h-4 text-[#3c8dbc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<h2 class="text-sm font-semibold text-gray-800 tracking-wide uppercase">Waktu & Tanggal Sistem</h2>
			</div>
			<span class="live-pulse-badge">
				<span class="pulse-dot"></span>
				LIVE
			</span>
		</div>
		<div class="clock-card-body">
			<div class="clock-digital-display">
				<span class="digital-time">{timeStr}</span>
				{#if showTimezone}
					<span class="digital-tz">{tzInfo.code}</span>
				{/if}
			</div>
			<div class="clock-date-row">
				<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<span class="digital-date">{dayName}, {dateFull}</span>
			</div>
			<div class="clock-zone-row">
				<span class="text-xs text-gray-500">{tzInfo.label}</span>
			</div>
		</div>
	</div>

{:else if variant === 'badge'}
	<span class="live-clock-badge">
		<svg class="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
		<span class="font-mono font-semibold">{timeStr}</span>
		{#if showTimezone}
			<span class="text-[10px] opacity-75">{tzInfo.code}</span>
		{/if}
	</span>

{:else}
	<!-- Inline -->
	<span class="live-clock-inline">
		{#if showDate}
			<span class="inline-date">{dayName}, {dateFull}</span>
		{/if}
		{#if showDate && showTime}
			<span class="mx-1.5 text-gray-400">•</span>
		{/if}
		{#if showTime}
			<span class="inline-time font-mono font-semibold">{timeStr}</span>
			{#if showTimezone}
				<span class="inline-tz text-xs text-gray-600 font-medium ml-1">({tzInfo.code})</span>
			{/if}
		{/if}
	</span>
{/if}

<style>
	/* Header Variant */
	.live-clock-header {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: rgba(0, 0, 0, 0.16);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 6px;
		padding: 5px 12px;
		color: #ffffff;
		font-size: 0.8125rem;
		line-height: 1;
		backdrop-filter: blur(4px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
		transition: background-color 0.2s ease, border-color 0.2s ease;
		user-select: none;
	}

	.live-clock-header:hover {
		background: rgba(0, 0, 0, 0.24);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.clock-item {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.clock-icon {
		width: 14px;
		height: 14px;
		opacity: 0.85;
		flex-shrink: 0;
	}

	.clock-divider {
		color: rgba(255, 255, 255, 0.3);
		font-weight: 300;
		font-size: 0.875rem;
		line-height: 1;
	}

	.date-full {
		display: inline;
		font-weight: 500;
	}

	.date-short {
		display: none;
		font-weight: 500;
	}

	.time-digits {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
		font-weight: 700;
		font-size: 0.875rem;
		letter-spacing: 0.03em;
		font-variant-numeric: tabular-nums;
	}

	.tz-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.22);
		padding: 2px 4px;
		border-radius: 3px;
		letter-spacing: 0.04em;
		line-height: 1;
	}

	/* Card Variant */
	.live-clock-card {
		background: #fff;
		border-radius: 4px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		border-top: 3px solid #3c8dbc;
		width: 100%;
		max-width: 480px;
	}

	.clock-card-header {
		padding: 12px 16px;
		border-bottom: 1px solid #f0f0f0;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.live-pulse-badge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.6875rem;
		font-weight: 700;
		color: #15803d;
		background: #dcfce7;
		padding: 2px 8px;
		border-radius: 9999px;
		letter-spacing: 0.05em;
	}

	.pulse-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #22c55e;
		box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
		animation: pulse-ring 1.8s infinite;
	}

	@keyframes pulse-ring {
		0% {
			transform: scale(0.95);
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
		}
		70% {
			transform: scale(1);
			box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
		}
		100% {
			transform: scale(0.95);
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
		}
	}

	.clock-card-body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.clock-digital-display {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.digital-time {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
		font-size: 2rem;
		font-weight: 700;
		color: #1e293b;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
	}

	.digital-tz {
		font-size: 0.875rem;
		font-weight: 700;
		color: #3c8dbc;
		background: #e8f4f8;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.clock-date-row {
		display: flex;
		align-items: center;
		gap: 6px;
		color: #334155;
		font-size: 0.9375rem;
		font-weight: 500;
	}

	.clock-zone-row {
		border-top: 1px dashed #e2e8f0;
		padding-top: 8px;
		margin-top: 2px;
	}

	/* Badge Variant */
	.live-clock-badge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		color: #334155;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 0.75rem;
		line-height: 1;
	}

	/* Inline Variant */
	.live-clock-inline {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		color: inherit;
		font-size: inherit;
	}

	.inline-time {
		font-variant-numeric: tabular-nums;
		color: #1e293b;
	}

	/* Responsive Header Styles */
	@media (max-width: 900px) {
		.date-full {
			display: none;
		}
		.date-short {
			display: inline;
		}
	}

	@media (max-width: 580px) {
		.date-section,
		.clock-divider {
			display: none;
		}
		.live-clock-header {
			padding: 4px 8px;
			font-size: 0.75rem;
			gap: 4px;
		}
		.time-digits {
			font-size: 0.8125rem;
		}
		.tz-badge {
			font-size: 0.625rem;
			padding: 1px 3px;
		}
	}
</style>
