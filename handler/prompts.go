package handler

import (
	"net/http"

	"github.com/tigerowo/infinite-canvas/service"
)

func Prompts(w http.ResponseWriter, r *http.Request) {
	result, err := service.ListPrompts(parseQuery(r))
	if err != nil {
		FailError(w, err)
		return
	}
	// 用户端不暴露远程仓库地址
	for i := range result.Items {
		result.Items[i].GithubURL = ""
	}
	OK(w, result)
}
