# frozen_string_literal: true

module Daylight
  class DeploysController < BaseController
    before_action :ensure_connected
    skip_before_action :verify_authenticity_token, only: [:create]

    def index
      deploys = Database::DeployRecord
        .order(deployed_at: :desc)
        .limit(50)
        .map { |d| serialize_deploy(d) }

      render inertia: "daylight/deploys", props: {
        deploys: deploys
      }
    end

    def create
      deploy = Database::DeployRecord.create!(
        version: params[:version],
        description: params[:description],
        git_sha: params[:git_sha],
        deployed_by: params[:deployed_by],
        deployed_at: Time.current
      )

      render json: {
        id: deploy.id,
        version: deploy.version,
        deployed_at: deploy.deployed_at
      }, status: :created
    end

    private

    def serialize_deploy(d)
      {
        id: d.id,
        version: d.version,
        description: d.description,
        git_sha: d.git_sha,
        deployed_by: d.deployed_by,
        deployed_at: d.deployed_at
      }
    end
  end
end
