pipeline {
  agent any

  environment {
    REGISTRY   = 'localhost:5000'                 // change to docker.io/yourname if using Docker Hub
    APP_IMG    = "${REGISTRY}/reservation-app"
    ITEMS_IMG  = "${REGISTRY}/reservation-items"
    TAG        = "${env.BUILD_NUMBER ?: 'local'}"
	KUBECONFIG = '/var/jenkins_home/.kube/config'
  }

  options {
    skipDefaultCheckout(true)
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build images') {
      steps {
        sh '''
          echo "Building web image..."
          docker build -t ${APP_IMG}:${TAG} .

          echo "Building items image..."
          docker build -t ${ITEMS_IMG}:${TAG} ./items
        '''
      }
    }

    stage('Smoke test') {
      steps {
        sh '''
          set -e
          VOL=menuvol-${BUILD_NUMBER}

          # shared volume for both containers
          docker volume create $VOL

          echo "Starting items sidecar..."
          docker run --rm -d --name smoke-items -v $VOL:/items ${ITEMS_IMG}:${TAG}

          echo "Starting web..."
          docker run --rm -d --name smoke-web -p 18080:80 -v $VOL:/items ${APP_IMG}:${TAG}

          echo "Wait for NGINX..."
          sleep 3

          # from inside Jenkins container, reach host port via host.docker.internal
          curl -sSf http://host.docker.internal:18080/ > /dev/null
          curl -sSf http://host.docker.internal:18080/listofitems.txt > /dev/null

          echo "Smoke test OK"
        '''
      }
      post {
        always {
          // Important: don't reference $VOL here (shell var). Recompute deterministically.
          sh '''
            docker rm -f smoke-web smoke-items || true
            docker volume rm menuvol-${BUILD_NUMBER} || true
          '''
        }
      }
    }

    stage('Push images') {
      steps {
        sh '''
          echo "Pushing images..."
          docker push ${APP_IMG}:${TAG}
          docker push ${ITEMS_IMG}:${TAG}
        '''
      }
    }
	
stage('Update menu (ConfigMap)') {
  steps {
    sh '''
      set -e

      # 1) compute checksum (only restart when content changes)
      NEW_HASH=$(sha256sum items/listofitems.txt | awk '{print $1}')
      echo "New list hash: $NEW_HASH"

      # 2) upsert ConfigMap from file
      kubectl -n reservation create configmap items-config \
        --from-file=items/listofitems.txt \
        --dry-run=client -o yaml | kubectl apply -f -

      # 3) PATCH the *pod template* annotation (this triggers a rollout)
      kubectl -n reservation patch deploy reservation \
        --type=merge \
        -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"menu-hash\":\"$NEW_HASH\"}}}}}"

      # 4) wait for rollout
      kubectl -n reservation rollout status deploy/reservation --timeout=60s
    '''
  }
}


  }
}
