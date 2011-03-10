BUILD_DIR := build
SOURCE_DIR := src
RALPH_DIR := ../ralph

SOURCE_FILES := $(wildcard $(SOURCE_DIR)/* $(SOURCE_DIR)/**/*)
FILES := $(patsubst $(SOURCE_DIR)/%, $(BUILD_DIR)/%, $(SOURCE_FILES))
FILES := $(patsubst %.ralph, %.js, $(FILES))

.PHONY: all

all: $(BUILD_DIR)/runtime $(FILES)

$(BUILD_DIR)/runtime: $(RALPH_DIR)/src/runtime/*
	ringo -l -b $(RALPH_DIR)/paths.js $(RALPH_DIR)/build.js --build $(BUILD_DIR) \
		--src $(RALPH_DIR)/src/ --async --bootstrapDirectories runtime

$(BUILD_DIR)/%.js: $(SOURCE_DIR)/%.ralph
	ringo -l -b $(RALPH_DIR)/paths.js $(RALPH_DIR)/build.js --build $(dir $@) \
		--src $(dir $<) --async --bootstrap $(notdir $<)

$(sort $(dir $(FILES))):
	mkdir $@

$(BUILD_DIR)/%: $(SOURCE_DIR)/%
	cp $< $@