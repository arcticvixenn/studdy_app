import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getVideoPosts } from '../../lib/appwrite';
import useAppwrite from '../../lib/useAppwrite';
import VideoFeedItem from '../../components/VideoFeedItem';

const Videos = () => {
  const { data: videos } = useAppwrite(getVideoPosts);
  const { height } = useWindowDimensions();

  const itemHeight = Math.max(height - 110, 520);
  const [activeIndex, setActiveIndex] = useState(0);

  const shorts = (videos || []).filter((item) => {
    return item?.mediaType === 'video' && item?.videoUrl;
  });

  useEffect(() => {
    if (shorts.length) {
      setActiveIndex(0);
    }
  }, [shorts.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const currentIndex = viewableItems[0].index;

      if (typeof currentIndex === 'number') {
        setActiveIndex(currentIndex);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 65,
    minimumViewTime: 250,
  }).current;

  return (
    <SafeAreaView className="bg-black h-full">
      {shorts.length ? (
        <FlatList
          data={shorts}
          keyExtractor={(item) => item.$id}
          renderItem={({ item, index }) => (
            <VideoFeedItem
              post={item}
              isActive={index === activeIndex}
              shouldPrepare={Math.abs(index - activeIndex) <= 1}
              itemHeight={itemHeight}
            />
          )}
          pagingEnabled
          snapToInterval={itemHeight}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={5}
          removeClippedSubviews={false}
          getItemLayout={(_, index) => ({
            length: itemHeight,
            offset: itemHeight * index,
            index,
          })}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-white text-xl font-psemibold text-center">
            Відео поки немає
          </Text>

          <Text className="text-gray-100 text-center mt-3">
            Створи першу навчальну відеопублікацію або Shorts.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Videos;
