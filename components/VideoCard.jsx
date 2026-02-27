import { View, Text, Image } from 'react-native'
import React, { useState } from 'react'
import { icons } from '../constants'
import { TouchableOpacity } from 'react-native'
import { Video, ResizeMode} from 'expo-av'


const VideoCard = ({ video }) => {
    if (!video || !video.creator) {
        console.error('Invalid video or creator data');
        return (
            <View style={{ alignItems: 'center', padding: 16, marginBottom: 14 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16 }}>Дані для відео не знайдені</Text>
            </View>
        );
    }

    const { title, thumbnail, video: videoUrl, creator: { username, avatar } } = video;
    const [play, setPlay] = useState(false);

    return (
        <View style={{ flexDirection: 'column', alignItems: 'center', padding: 16, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 46, height: 46, borderRadius: 12, borderWidth: 1, borderColor: '#CCCCCC', padding: 1 }}>
                        {avatar ? (
                            <Image
                                source={{ uri: avatar }}
                                style={{ width: '100%', height: '100%', borderRadius: 12 }}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={{ width: '100%', height: '100%', backgroundColor: '#555555', borderRadius: 12 }} />
                        )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                            {title || 'Untitled'}
                        </Text>
                        <Text style={{ color: '#AAAAAA', fontSize: 12 }} numberOfLines={1}>
                            {username || 'Unknown Creator'}
                        </Text>
                    </View>
                </View>
                <Image source={{ uri: 'menu_icon_uri' }} style={{ width: 20, height: 20 }} resizeMode="contain" />
            </View>

            {play ? (
                <Video
                    source={{ uri: videoUrl }}
                    style={{
                        width: '100%',
                        height: 240,
                        borderRadius: 12,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    shouldPlay
                    onPlaybackStatusUpdate={(status) => {
                        if (status.didJustFinish) setPlay(false);
                    }}
                />
            ) : (
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setPlay(true)}
                    style={{ width: '100%', height: 240, borderRadius: 12, marginTop: 12, justifyContent: 'center', alignItems: 'center' }}
                >
                    <Image
                        source={{ uri: thumbnail }}
                        style={{ width: '100%', height: '100%', borderRadius: 12 }}
                        resizeMode="cover"
                    />
                    <Image source={{ uri: 'play_icon_uri' }} style={{ width: 48, height: 48, position: 'absolute' }} resizeMode="contain" />
                </TouchableOpacity>
            )}
        </View>
    );
};

export default VideoCard;

