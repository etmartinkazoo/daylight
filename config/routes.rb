# frozen_string_literal: true

Daylight::Engine.routes.draw do
  namespace :errors, path: "errors" do
    get "resolved", to: "resolved#index", as: :resolved
    get "ignored",  to: "ignored#index",  as: :ignored
    get "all",      to: "all#index",      as: :all
  end

  resources :errors, only: [:index, :show, :update, :destroy], constraints: { id: /\d+/ }
  post "errors/batch", to: "error_batches#create", as: :error_batch

  resources :requests, only: [:index]
  resources :queries, only: [:index]
  resources :jobs, only: [:index]
  resources :scheduled_tasks, only: [:index]
  resources :mail_events, only: [:index]
  resources :logs, only: [:index]
  resources :deploys, only: [:index, :create]
  resources :http_requests, only: [:index]
  resources :cache, only: [:index]
  resources :incidents, only: [:index, :show, :update]

  resources :solutions, only: [:index, :show, :update]
  namespace :solutions do
    resource :generation, only: [:create]
  end
  scope "solutions/:solution_id", as: :solution do
    resource :chat,       only: [:create], controller: "solutions/chats"
    resource :push,       only: [:create], controller: "solutions/pushes"
    resource :generation, only: [:update], controller: "solutions/generations"
  end

  # AI chat endpoints
  namespace :ai do
    resources :chats, only: [:create, :show, :destroy] do
      resource :message, only: [:create], controller: "messages"
    end
    resources :mentions, only: [:index]
    resource  :action,   only: [:create], controller: "actions"
    resource  :proposal, only: [:create, :update], controller: "proposals"
  end

  get   :settings, to: "settings#index"
  patch :settings, to: "settings#update"
  get   "settings/general",       to: "settings#general",       as: :settings_general
  get   "settings/branding",      to: "settings#branding",      as: :settings_branding
  get   "settings/notifications", to: "settings#notifications", as: :settings_notifications
  get   "settings/performance",   to: "settings#performance",   as: :settings_performance
  get   "settings/ai",            to: "settings#ai",            as: :settings_ai
  get   "settings/scans",         to: "settings#scans",         as: :settings_scans
  get :health, to: "health#index"

  # Export endpoints
  get "errors/export", to: "error_exports#show", as: :errors_export
  get "requests/export", to: "request_exports#show", as: :requests_export
  get "queries/export", to: "query_exports#show", as: :queries_export
  get "jobs/export", to: "job_exports#show", as: :jobs_export
  get "logs/export", to: "log_exports#show", as: :logs_export
  get "scheduled_tasks/export", to: "scheduled_task_exports#show", as: :scheduled_tasks_export
  get "mail_events/export", to: "mail_event_exports#show", as: :mail_events_export
  get "http_requests/export", to: "http_request_exports#show", as: :http_requests_export

  # Settings sub-resources
  namespace :settings do
    resource  :cleanup,            only: [:create]
    resource  :notification_test,  only: [:create]
    resource  :performance_scan,   only: [:create]
    resource  :security_scan,      only: [:create]
    resources :performance_issues, only: [:update]
    resources :security_issues,    only: [:update]
    resource  :bullet_diagnostic,  only: [:create, :destroy]
  end

  root to: "errors#index"
end
