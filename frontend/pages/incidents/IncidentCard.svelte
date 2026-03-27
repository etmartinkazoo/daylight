<script>
  let { incident, onclick } = $props();
</script>

<button
  class="incident-card"
  class:incident-card-investigating={incident.status === "investigating"}
  class:incident-card-critical={incident.severity === "critical"}
  {onclick}
>
  <div class="severity-bar" data-severity={incident.severity}></div>

  <div class="incident-content">
    <div class="incident-top">
      <div class="incident-badges">
        <span class="severity-badge" data-severity={incident.severity}>
          {incident.severity}
        </span>
        <span class="type-badge" data-type={incident.incident_type}>
          {incident.incident_type}
        </span>
        <span class="status-badge" data-status={incident.status}>
          {#if incident.status === "investigating"}
            <span class="status-spinner"></span>
          {/if}
          {incident.status === "false_alarm" ? "False Alarm" : incident.status}
        </span>
      </div>
      <span class="incident-time">{incident.started_at_ago}</span>
    </div>

    <h3 class="incident-title">{incident.title}</h3>

    {#if incident.summary}
      <p class="incident-summary">{incident.summary}</p>
    {/if}

    <div class="incident-footer">
      {#if incident.status === "investigating"}
        <span class="investigating-label">
          <span class="investigating-spinner"></span>
          Investigating...
        </span>
      {:else if incident.investigation}
        <span class="view-report">View Report &rarr;</span>
      {:else}
        <span class="incident-meta"
          >{incident.started_at
            ? new Date(incident.started_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}</span
        >
      {/if}
    </div>
  </div>
</button>

<style>
  .incident-card {
    display: flex;
    align-items: stretch;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    font-family: inherit;
    width: 100%;
    padding: 0;

    &:hover {
      box-shadow:
        0 4px 12px -2px rgba(0, 0, 0, 0.08),
        0 2px 4px -2px var(--color-border-subtle-alpha);
      transform: translateY(-1px);
      border-color: var(--color-muted-lightest);

      .view-report {
        color: var(--color-info-darker);
        text-decoration: underline;
      }
    }

    &.incident-card-investigating {
      border-color: var(--color-warning-border);
      animation: border-pulse 3s ease-in-out infinite;
    }

    &.incident-card-critical {
      background: var(--color-danger-bg);
    }
  }

  @keyframes border-pulse {
    0%,
    100% {
      border-color: var(--color-warning-border);
    }
    50% {
      border-color: var(--color-warning);
    }
  }

  .severity-bar {
    width: 4px;
    flex-shrink: 0;
    background: var(--color-muted);

    &[data-severity="critical"] {
      background: var(--color-danger);
    }
    &[data-severity="warning"] {
      background: var(--color-warning);
    }
    &[data-severity="info"] {
      background: var(--color-info);
    }
  }

  .incident-content {
    flex: 1;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  .incident-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .incident-badges {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .severity-badge {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
    background: var(--color-accent);
    color: var(--color-muted);
    border: 1px solid var(--color-border);

    &[data-severity="critical"] {
      background: var(--color-danger-subtle);
      color: var(--color-danger);
      border-color: var(--color-danger-border);
    }
    &[data-severity="warning"] {
      background: var(--color-warning-subtle);
      color: var(--color-warning-dark);
      border-color: var(--color-warning-border);
    }
    &[data-severity="info"] {
      background: var(--color-info-subtle);
      color: var(--color-info);
      border-color: var(--color-info-border);
    }
  }

  .type-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
    background: var(--color-danger-subtle);
    color: var(--color-danger-hover);

    &[data-type="Latency Spike"] {
      background: var(--color-warning-subtle);
      color: var(--color-warning-dark);
    }
  }

  .status-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--color-accent);
    color: var(--color-muted);

    &[data-status="open"] {
      background: var(--color-danger-subtle);
      color: var(--color-danger-hover);
    }
    &[data-status="investigating"] {
      background: var(--color-warning-subtle);
      color: var(--color-warning-dark);
    }
    &[data-status="resolved"] {
      background: var(--color-success-subtle);
      color: var(--color-success-dark);
    }
  }

  .status-spinner {
    width: 0.5rem;
    height: 0.5rem;
    border: 1.5px solid var(--color-warning-dark);
    border-top-color: transparent;
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .incident-time {
    font-size: 0.75rem;
    color: var(--color-muted-light);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .incident-title {
    font-size: 0.9375rem;
    font-weight: 650;
    color: var(--color-fg);
    margin: 0;
    line-height: 1.3;
  }

  .incident-summary {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .incident-footer {
    display: flex;
    align-items: center;
    margin-top: 0.25rem;
  }

  .investigating-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-warning-dark);
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }

  .investigating-spinner {
    width: 0.75rem;
    height: 0.75rem;
    border: 2px solid var(--color-warning-border);
    border-top-color: var(--color-warning);
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.8s linear infinite;
  }

  .view-report {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-info);
  }

  .incident-meta {
    font-size: 0.75rem;
    color: var(--color-muted-light);
  }
</style>
