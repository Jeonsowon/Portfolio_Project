package com.example.portfolioai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class OpenAiClientConfig {

    @Bean("openAiWebClient")
    public WebClient openAiWebClient(
            WebClient.Builder builder,
            @Value("${openai.base-url:https://api.openai.com/v1}") String baseUrl,
            @Value("${openai.api-key:}") String apiKey
    ) {
        return builder
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}