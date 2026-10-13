package com.nomina.numa.bootstrap;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MongoCollectionInitializer {

    private final MongoTemplate mongoTemplate;
    private final MongoMappingContext mongoMappingContext;

    @EventListener(ApplicationReadyEvent.class)
    public void createMissingCollections() {
        mongoMappingContext.getPersistentEntities().forEach(entity -> {
            String collection = entity.getCollection();
            if (!mongoTemplate.collectionExists(collection)) {
                mongoTemplate.createCollection(collection);
            }
        });
    }
}
