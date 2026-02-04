import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { type ServiceRecord, type Bike } from '@/lib/api';

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
    },
    section: {
        margin: 10,
        padding: 10,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    label: {
        width: 100,
        fontWeight: 'bold',
        fontSize: 10,
        color: '#666',
    },
    value: {
        flex: 1,
        fontSize: 11,
    },
    checklist: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 10,
    },
    checklistItem: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 10,
        color: '#999',
    },
});

interface ServiceReportProps {
    service: ServiceRecord;
    bike: Bike;
    clientName: string;
}

export const ServiceReport = ({ service, bike, clientName }: ServiceReportProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>MechanicPro</Text>
                    <Text style={styles.subtitle}>Informe de Servicio Técnico</Text>
                </View>
                <Text style={{ fontSize: 10 }}>#{service.id}</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.label}>Cliente:</Text>
                    <Text style={styles.value}>{clientName}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Bicicleta:</Text>
                    <Text style={styles.value}>{bike.brand} {bike.model}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Transmisión:</Text>
                    <Text style={styles.value}>{bike.transmission}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.label}>Tipo de Servicio:</Text>
                    <Text style={styles.value}>{service.service_type}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Fecha:</Text>
                    <Text style={styles.value}>{service.date_out ? new Date(service.date_out).toLocaleDateString("es-AR") : "En Curso"}</Text>
                </View>
            </View>

            <View style={[styles.section, styles.checklist]}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Trabajos Realizados</Text>
                {service.checklist_data && Object.entries(service.checklist_data).map(([task, done]) => (
                    <View key={task} style={styles.checklistItem}>
                        <Text style={{ width: 20 }}>{done ? "[X]" : "[ ]"}</Text>
                        <Text style={{ fontSize: 11 }}>{task}</Text>
                    </View>
                ))}
            </View>

            {service.parts_used && (
                <View style={styles.section}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Repuestos / Insumos</Text>
                    <Text style={styles.value}>{service.parts_used}</Text>
                </View>
            )}

            {service.mechanic_notes && (
                <View style={styles.section}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5 }}>Observaciones del Mecánico</Text>
                    <Text style={styles.value}>{service.mechanic_notes}</Text>
                </View>
            )}

            <Text style={styles.footer}>Gracias por confiar en MechanicPro. Mantenga su bicicleta rodando.</Text>
        </Page>
    </Document>
);
