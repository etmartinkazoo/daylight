# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "daylight"
  spec.version       = "0.1.0"
  spec.authors       = ["Runwell"]
  spec.summary       = "Lightweight error tracking with a built-in dashboard, backed by SQLite."
  spec.description   = "Drop-in Rails engine that captures application errors, groups recurrences, and serves a simple dashboard. Uses its own SQLite database — no impact on your app DB."
  spec.license       = "MIT"
  spec.required_ruby_version = ">= 3.1"

  spec.files = Dir["lib/**/*", "app/**/*", "config/**/*", "db/**/*", "LICENSE", "README.md"]
  spec.require_paths = ["lib"]

  spec.add_dependency "rails", ">= 7.0"
  spec.add_dependency "sqlite3"
  spec.add_dependency "ruby_llm", ">= 1.12"
  spec.add_dependency "alba"
  spec.add_dependency "brakeman"
  spec.add_dependency "propshaft"
end
