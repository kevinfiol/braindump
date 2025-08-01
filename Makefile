# constants
PORT=8081
HOST=localhost

# vendor
REDBEAN=vendor/redbean.com
ASSIMILATE=vendor/assimilate

# build
BUILD_DIR=build
BUILD=${BUILD_DIR}/braindump.com
DATA_DIR=${BUILD_DIR}/data
PID_FILE=${BUILD_DIR}/redbean.pid
LOG_FILE=${BUILD_DIR}/redbean.log

.PHONY: download
download:
	pnpm install
	curl -o ${REDBEAN} https://redbean.dev/redbean-3.0.0.com && chmod +x ${REDBEAN}
	curl -o ${ASSIMILATE} https://cosmo.zip/pub/cosmos/bin/assimilate && chmod +x ${ASSIMILATE}

.PHONY: build
build:
	pnpm run build
	cp -f ${REDBEAN} ${BUILD}
	cd src/ && zip -r ../${BUILD} `ls -A`

.PHONY: run
run: build
	${BUILD} -vv -p ${PORT} -l ${HOST} -D ./${BUILD_DIR}/

.PHONY: start
start: build
	@(test ! -f ${PID_FILE} && \
		${BUILD} -vv -d -L ${LOG_FILE} -P ${PID_FILE} -p ${PORT} -l ${HOST} -D ./${BUILD_DIR}/ \
	|| echo "Redbean is already running at $$(cat ${PID_FILE})")

.PHONY: stop
stop:
	@(test -f ${PID_FILE} && \
		kill -TERM $$(cat ${PID_FILE}) && \
		rm ${PID_FILE} \
	|| true)

.PHONY: restart
restart: stop build start

.PHONY: watch
watch:
	make stop
	make start && \
	trap 'make stop' EXIT INT TERM && \
	watchexec -p -w src -w ./frontend make restart

.PHONY: logs
logs:
	tail -f ${LOG_FILE}

.PHONY: clean
clean:
	rm -f ${REDBEAN}
	rm -f ${ASSIMILATE}
	rm -f ${BUILD}
	rm -f ${LOG_FILE}
	rm -f ${PID_FILE}
	rm -rf ${DATA_DIR}

