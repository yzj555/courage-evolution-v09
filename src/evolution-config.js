export const FORMS=[
 {id:'botamon',name:'黑球兽',en:'BOTAMON',stage:'幼年期 I',height:1.65,color:'#596257',description:'柔软的小小起点。呼吸时身体轻轻起伏，短耳随着弹跳回落。',actions:['耳朵回应','轻轻鼓气','轻跃蹦跳'],mouth:false},
 {id:'koromon',name:'滚球兽',en:'KOROMON',stage:'幼年期 II',height:2.2,color:'#c78498',description:'粉色身体与细长触角。抬头张嘴、轻弹落地，触角稍晚一步跟随。',actions:['触角摆动','张嘴回应','轻跃蹦跳'],mouth:true},
 {id:'agumon',name:'亚古兽',en:'AGUMON',stage:'成长期',height:2.8,color:'#bf8f32',description:'放松肩臂，掌心朝前招手。踏步由腿部屈伸带动，头部保持稳定。',actions:['挥爪招手','张嘴小吼','原地踏步'],mouth:true},
 {id:'greymon',name:'暴龙兽',en:'GREYMON',stage:'成熟期',height:3.2,color:'#b67931',description:'前臂饱满，双爪略收，双腿错步屈膝。长尾弯曲上扬、轻轻摆动，低吼时气浪从嘴部向外扩散。',actions:['前爪活动','气浪低吼','原地踏步'],mouth:true},
 {id:'metalgreymon',name:'机械暴龙兽',en:'METALGREYMON',stage:'完全体',height:3.35,color:'#7c7394',description:'机械臂屈肘外展，三枚爪尖向掌内弯曲。后腿错步支撑、弯尾随动，展翼低吼时释放层层气浪。',actions:['机械臂活动','展翼低吼','稳步踏动'],mouth:true},
 {id:'wargreymon',name:'战斗暴龙兽',en:'WARGREYMON',stage:'究极体',height:3.25,color:'#ad934b',description:'错步屈膝，双爪一前一后戒备。举臂时双掌相对，托抱聚集的能量，再将盖亚能量炮向前投出。',actions:['龙爪挥击','展盾戒备','调整步伐'],mouth:false}
];
export const RIGS={
 botamon:{root:'GRP_joint',center:'J_center',head:'J_face2',ears:['J_mimiL','J_mimiR'],baby:true},
 koromon:{root:'J_base',center:'J_center',head:'J_ue_ago',jaw:'J_ue_ago',ears:['J_mimiL','J_mimiR'],baby:true},
 greymon:{root:'J_root',center:'J_center',chest:'J_chest',head:'J_haed',jaw:'J_chin',arms:['J_arm_l','J_arm_r'],elbows:['J_ancon_l','J_ancon_r'],hands:['J_hand_l','J_hand_r'],hips:['J_leg_l','J_leg_r'],knees:['J_knee_l','J_knee_r'],feet:['J_foot_l','J_foot_r'],toes:['J_toe_l','J_toe_r'],tail:['J_tail','J_tail1','J_tail2','J_tail3','J_tail4']},
 metalgreymon:{root:'J_root_032',center:'J_center',waist:'J_hara',chest:'J_mune',head:'J_atama',jaw:'J_ago',arms:['J_ude_L','J_ude_R'],elbows:['J_hiji_L','J_hiji_R'],hands:['J_claw000','J_te_R'],hips:['J_momo_L','J_momo_R'],knees:['J_hiza_L','J_hiza_R'],feet:['J_kakato_L','J_kakato_R'],toes:['J_tumasaki_L','J_tumasaki_R'],tail:['J_sippo1','J_sippo2','J_sippo3','J_sippo4','J_sippo5','J_sippo6'],wings:['J_hane_tukene_L','J_hane_tukene_R','J_hane_tukeneB_L','J_hane_tukeneB_R','J_hane_tukeneC_L','J_hane_tukeneC_R']},
 wargreymon:{root:'J_root',center:'J_center',waist:'J_spine01',chest:'J_spine02',neck:'J_neck',head:'J_head',arms:['J_arm_l','J_arm_r'],elbows:['J_elbow_l','J_elbow_r'],hands:['J_weapon_l','J_weapon_r'],hips:['J_leg_l','J_leg_r'],knees:['J_knee_l','J_knee_r'],feet:['J_foot_l','J_foot_r'],toes:['J_toe_l','J_toe_r'],shields:['J_shield01_l','J_shield01_r']}
};
