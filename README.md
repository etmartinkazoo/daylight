# Daylight

Rails engine for application monitoring — errors, requests, queries, jobs, logs, incidents, and AI-assisted diagnostics.

## Requirements

- Ruby 3.2+
- Rails 7.1+
- SolidQueue (for background jobs and scheduled scans)
- Falcon (recommended) or Puma + Redis (for async AI chat processing)

## Installation

Add to your Gemfile:

```ruby
gem "daylight", path: "path/to/daylight"
```

Mount the engine in `config/routes.rb`:

```ruby
mount Daylight::Engine, at: "/daylight"
```

## SolidQueue recurring tasks

Daylight uses a scheduled job to check if performance, security, or solution scans are due. Add the following to your `config/recurring.yml`:

```yaml
daylight_scan_scheduler:
  class: Daylight::ScanSchedulerJob
  schedule: every minute
```

This replaces the need for any cron setup — SolidQueue handles the scheduling.

## Async AI chat processing

Daylight's AI chat uses `async-job` for non-blocking LLM requests. A single process can handle thousands of concurrent AI conversations instead of blocking one SolidQueue worker thread per request.

### With Falcon (recommended)

```ruby
# config/application.rb
config.active_job.queue_adapter = :solid_queue # keep for regular jobs
```

```ruby
# config/initializers/async_job_adapter.rb
require "async/job/processor/inline"

Rails.application.configure do
  config.async_job.define_queue "default" do
    dequeue Async::Job::Processor::Inline
  end
end
```

Daylight's LLM jobs automatically use the async-job adapter while your regular jobs stay on SolidQueue.

### With Puma + Redis

```ruby
# Gemfile
gem "async-job-processor-redis"
```

```ruby
# config/initializers/async_job_adapter.rb
require "async/job/processor/redis"

Rails.application.configure do
  config.async_job.define_queue "default" do
    dequeue Async::Job::Processor::Redis
  end
end
```

```yaml
# Procfile.dev — add the async job processor
async_job: bundle exec async-job-adapter-active_job-server
```

### Fiber-safe ActiveRecord connections

If using Falcon or async workloads, configure fiber-scoped database connections:

```ruby
# config/application.rb
config.active_support.isolation_level = :fiber
```
