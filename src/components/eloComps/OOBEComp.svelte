<script lang="ts">
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { AlertTriangle, CheckSquare, Square } from "lucide-svelte";

    let isVisible = false;

    let checks = {
        math: false,
        bias: false,
        serious: false,
        beta: false,
    };

    // Svelte's reactive statement to watch if all boxes are checked
    $: allChecked = checks.math && checks.bias && checks.serious && checks.beta;

    onMount(() => {
        const hasSeenOOBE = localStorage.getItem("owcs_nexus_gpr_oobe");
        if (!hasSeenOOBE) {
            setTimeout(() => {
                isVisible = true;
            }, 800);
        }
    });

    function handleEnter() {
        if (allChecked) {
            localStorage.setItem("owcs_nexus_gpr_oobe", "true");
            isVisible = false;
        }
    }

    function toggleCheck(key: keyof typeof checks) {
        checks[key] = !checks[key];
    }
</script>

{#if isVisible}
    <div
        transition:fade={{ duration: 200 }}
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
        <div
            transition:fly={{ y: 20, duration: 400 }}
            class="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
            <div
                class="p-6 border-b border-white/5 bg-neutral-950 flex items-center gap-4"
            >
                <div class="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h2
                        class="text-2xl font-title uppercase tracking-wide text-white"
                    >
                        Welcome to the TGS
                    </h2>
                    <p class="text-xs font-mono text-neutral-500 uppercase">
                        Team Global Standings • Algorithm v1.0
                    </p>
                </div>
            </div>

            <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <p class="text-sm text-neutral-300 leading-relaxed">
                    Before you look at the numbers and start angrily typing on
                    r/CompetitiveOverwatch or on Twitter, you must acknowledge
                    the following truths about how this algorithm works:
                </p>

                <div class="space-y-3">
                    <div
                        on:click={() => toggleCheck("math")}
                        class="flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all {checks.math
                            ? 'bg-white/5 border-emerald-500/50'
                            : 'bg-black/20 border-white/5 hover:border-white/20'}"
                    >
                        <div
                            class="mt-0.5 {checks.math
                                ? 'text-emerald-500'
                                : 'text-neutral-600'}"
                        >
                            {#if checks.math}
                                <CheckSquare size={20} />
                            {:else}
                                <Square size={20} />
                            {/if}
                        </div>
                        <div>
                            <h4
                                class="text-sm font-bold {checks.math
                                    ? 'text-emerald-400'
                                    : 'text-neutral-300'}"
                            >
                                Math is Blind
                            </h4>
                            <p class="text-xs text-neutral-500 mt-1">
                                I understand the algorithm doesn't know that my
                                favourite team "played well but lost". If it
                                sees a 3-1 loss, it will update their ELO
                                accordingly based on numbers, not feelings.
                            </p>
                        </div>
                    </div>

                    <div
                        on:click={() => toggleCheck("bias")}
                        class="flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all {checks.bias
                            ? 'bg-white/5 border-emerald-500/50'
                            : 'bg-black/20 border-white/5 hover:border-white/20'}"
                    >
                        <div
                            class="mt-0.5 {checks.bias
                                ? 'text-emerald-500'
                                : 'text-neutral-600'}"
                        >
                            {#if checks.bias}
                                <CheckSquare size={20} />
                            {:else}
                                <Square size={20} />
                            {/if}
                        </div>
                        <div>
                            <h4
                                class="text-sm font-bold {checks.bias
                                    ? 'text-emerald-400'
                                    : 'text-neutral-300'}"
                            >
                                Regional Baselines Exist
                            </h4>
                            <p class="text-xs text-neutral-500 mt-1">
                                I understand that OWCS teams start at different
                                regional baselines based on the historical
                                performances of their respective regions, as not
                                all regions are built the same.
                            </p>
                        </div>
                    </div>

                    <div
                        on:click={() => toggleCheck("serious")}
                        class="flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all {checks.serious
                            ? 'bg-white/5 border-emerald-500/50'
                            : 'bg-black/20 border-white/5 hover:border-white/20'}"
                    >
                        <div
                            class="mt-0.5 {checks.serious
                                ? 'text-emerald-500'
                                : 'text-neutral-600'}"
                        >
                            {#if checks.serious}
                                <CheckSquare size={20} />
                            {:else}
                                <Square size={20} />
                            {/if}
                        </div>
                        <div>
                            <h4
                                class="text-sm font-bold {checks.serious
                                    ? 'text-emerald-400'
                                    : 'text-neutral-300'}"
                            >
                                It's Just a Number
                            </h4>
                            <p class="text-xs text-neutral-500 mt-1">
                                I promise to NOT use these scores to harass
                                players, coaches, or fans, as it's meant to be a
                                fun statistical tool and a "strong
                                approximation" of the state of the OWCS
                                landscape, rather than the absolute truth.
                            </p>
                        </div>
                    </div>

                    <div
                        on:click={() => toggleCheck("beta")}
                        class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all mt-4 {checks.beta
                            ? 'bg-amber-500/10 border-amber-500/50'
                            : 'bg-amber-950/20 border-amber-500/20'}"
                    >
                        <div
                            class="mt-0.5 {checks.beta
                                ? 'text-amber-500'
                                : 'text-amber-700'}"
                        >
                            {#if checks.beta}
                                <CheckSquare size={18} />
                            {:else}
                                <Square size={18} />
                            {/if}
                        </div>
                        <div>
                            <h4
                                class="text-sm font-bold {checks.beta
                                    ? 'text-amber-400'
                                    : 'text-amber-600'}"
                            >
                                This is a v1.0
                            </h4>
                            <p
                                class="text-xs {checks.beta
                                    ? 'text-amber-200/70'
                                    : 'text-amber-700/70'} mt-1 leading-tight"
                            >
                                I understand that this ranking system is
                                currently in its initial deployment phase and
                                some data discrepancies may exist.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-6 pt-0 shrink-0">
                <button
                    on:click={handleEnter}
                    disabled={!allChecked}
                    class="w-full py-4 rounded-xl font-barlow font-bold uppercase tracking-widest transition-all duration-300 {allChecked
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] translate-y-0'
                        : 'bg-neutral-800 text-neutral-600 cursor-not-allowed translate-y-1'}"
                >
                    {allChecked
                        ? "I Understand, Let Me In"
                        : "Acknowledge all to enter"}
                </button>
            </div>
        </div>
    </div>
{/if}
