<script lang="ts">
    import { onMount } from "svelte";

    const STORAGE_KEY = "nexus_meta_oobe_dismissed";

    let visible = false;
    let currentStep = 0;

    onMount(() => {
        const dismissed = localStorage.getItem(STORAGE_KEY);
        if (!dismissed) visible = true;
    });

    function dismiss() {
        localStorage.setItem(STORAGE_KEY, "1");
        visible = false;
    }

    function next() {
        if (currentStep < steps.length - 1) currentStep++;
        else dismiss();
    }

    function prev() {
        if (currentStep > 0) currentStep--;
    }

    const steps = [
        {
            icon: `<svg class="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
            label: "Welcome",
            title: "Meta Report",
            body: "This page analyses every hero ban made across OWCS matches. All data is derived from real match records, updated automatically after each sync.",
            accent: "text-violet-400",
            border: "border-violet-500/30",
            bg: "bg-violet-500/5",
        },
        {
            icon: `<svg class="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>`,
            label: "Ban Rate",
            title: "What is Ban Rate?",
            body: "In official OWCS matches, each team has 2 bans at its disposal for each map. The 'ban rate' of a hero is how often it gets banned across all played maps. A 10% ban rate in professional play means the hero was banned in 1 out of every 10 available slots.",
            accent: "text-violet-400",
            border: "border-violet-500/30",
            bg: "bg-violet-500/5",
        },
        {
            icon: `<svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
            label: "Win Rate",
            title: "What does Win Rate mean here?",
            body: "Win rate is the percentage of maps where a hero was banned and the banning team won. A high win rate on a specific hero can indicate an effective ban, but it can also be influenced by other factors.",
            accent: "text-emerald-400",
            border: "border-emerald-500/30",
            bg: "bg-emerald-500/5",
            note: "≥ 60% green · 40–60% neutral · ≤ 40% red",
        },
        {
            icon: `<svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>`,
            label: "Heatmap",
            title: "Regional Meta Heatmap",
            body: "The heatmap below shows ban frequency broken down by tournament. Each column is a tournament, each row is a hero. Intensity is adjusted per column, so you can compare regional priorities even when regions played different numbers of maps.",
            accent: "text-blue-400",
            border: "border-blue-500/30",
            bg: "bg-blue-500/5",
        },
        {
            icon: `<svg class="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
            label: "By Team",
            title: "Team Ban Breakdown",
            body: 'Switch to "By Team" to see how a specific team picks their bans. The pie chart shows the split across all heroes they\'ve banned, showing their overall strategy and how spread out their bans are.',
            accent: "text-violet-400",
            border: "border-violet-500/30",
            bg: "bg-violet-500/5",
        },
    ];

    $: step = steps[currentStep];
    $: isLast = currentStep === steps.length - 1;
</script>

{#if visible}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);"
        on:click|self={dismiss}
        role="dialog"
        aria-modal="true"
    >
        <!-- Modal -->
        <div
            class="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
        >
            <!-- Progress bar -->
            <div class="h-0.5 bg-neutral-800">
                <div
                    class="h-full bg-violet-500 transition-all duration-500"
                    style="width: {((currentStep + 1) / steps.length) * 100}%"
                ></div>
            </div>

            <!-- Step pills -->
            <div class="flex items-center gap-1.5 px-6 pt-5">
                {#each steps as s, i}
                    <button
                        on:click={() => (currentStep = i)}
                        class="flex-1 h-1 rounded-full transition-all duration-300
              {i <= currentStep ? 'bg-violet-500' : 'bg-neutral-800'}"
                    ></button>
                {/each}
            </div>

            <!-- Content -->
            <div class="px-6 pt-6 pb-4">
                <!-- Icon + label -->
                <div class="flex items-center gap-3 mb-5">
                    <div
                        class="p-2.5 rounded-xl {step.bg} border {step.border}"
                    >
                        {@html step.icon}
                    </div>
                    <span
                        class="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500"
                    >
                        Step {currentStep + 1} of {steps.length} · {step.label}
                    </span>
                </div>

                <!-- Title -->
                <h2
                    class="font-title uppercase text-3xl text-white leading-tight mb-3"
                >
                    {step.title}
                </h2>

                <!-- Body -->
                <p class="text-neutral-400 text-sm leading-relaxed mb-4">
                    {step.body}
                </p>

                <!-- Optional note -->
                {#if step.note}
                    <div
                        class="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800"
                    >
                        <span
                            class="text-[10px] font-mono text-neutral-500 uppercase tracking-widest"
                            >{step.note}</span
                        >
                    </div>
                {/if}
            </div>

            <!-- Footer -->
            <div
                class="flex items-center justify-between px-6 py-4 border-t border-neutral-800"
            >
                <button
                    on:click={dismiss}
                    class="text-neutral-600 hover:text-neutral-400 font-mono text-xs uppercase tracking-widest transition-colors"
                >
                    Skip
                </button>

                <div class="flex items-center gap-3">
                    {#if currentStep > 0}
                        <button
                            on:click={prev}
                            class="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-600
                text-neutral-400 hover:text-white font-mono text-xs uppercase tracking-widest
                rounded-lg transition-all"
                        >
                            Back
                        </button>
                    {/if}
                    <button
                        on:click={next}
                        class="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white
              font-mono text-xs uppercase tracking-widest rounded-lg transition-all"
                    >
                        {isLast ? "Got it" : "Next"}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
