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
          echo 'Running smoke test...'
          docker run --rm -d --name smoke-items ${ITEMS_IMG}:${TAG}
          docker run --rm -d --name smoke-web -p 18080:80 --volumes-from smoke-items ${APP_IMG}:${TAG}
          sleep 3
          curl -sSf http://localhost:18080/ >/dev/null
          curl -sSf http://localhost:18080/listofitems.txt >/dev/null
        """
      }
      post {
        always {
          sh "docker rm -f smoke-web smoke-items || true"
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
