pipeline {
  agent any

  environment {
    REGISTRY   = 'localhost:5000'          // use Docker Hub instead if you want
    APP_IMG    = "${REGISTRY}/reservation-app"
    ITEMS_IMG  = "${REGISTRY}/reservation-items"
    TAG        = "${env.BUILD_NUMBER ?: 'local'}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build images') {
      steps {
        sh """
          echo 'Building web image...'
          docker build -t ${APP_IMG}:${TAG} .

          echo 'Building items image...'
          docker build -t ${ITEMS_IMG}:${TAG} ./items
        """
      }
    }

stage('Smoke test') {
  steps {
    sh """
      set -e
      VOL=menuvol-${BUILD_NUMBER}

      # shared volume
      docker volume create $VOL

      echo 'Starting items sidecar...'
      docker run --rm -d --name smoke-items -v $VOL:/items ${ITEMS_IMG}:${TAG}

      echo 'Starting web...'
      docker run --rm -d --name smoke-web -p 18080:80 -v $VOL:/items ${APP_IMG}:${TAG}

      echo 'Wait a bit...'
      sleep 3

      # from inside Jenkins container, reach host port via host.docker.internal
      curl -sSf http://host.docker.internal:18080/ >/dev/null
      curl -sSf http://host.docker.internal:18080/listofitems.txt >/dev/null
      echo 'OK'
    """
  }
  post {
    always {
      sh """
        docker rm -f smoke-web smoke-items || true
        docker volume rm menuvol-${BUILD_NUMBER} || true
      """
    }
  }
}

    stage('Push images') {
      steps {
        sh """
          echo 'Pushing images to registry...'
          docker push ${APP_IMG}:${TAG}
          docker push ${ITEMS_IMG}:${TAG}
        """
      }
    }
  }
}
